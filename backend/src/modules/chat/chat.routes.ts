import { Router, Response } from "express";
import { z } from "zod";
import { pool } from "@/db/pool";
import { AuthenticatedRequest, requireAuth } from "@/middleware/auth.middleware";
import { rateLimitByUser } from "@/middleware/rateLimit.middleware";
import {
  getDocumentOwnedByUser,
  retrieveRelevantChunks,
} from "@/modules/documents/documents.service";
import { getLLMProvider } from "@/modules/llm/provider.factory";
import {
  buildSystemPrompt,
  buildUserPrompt,
  QA_PROMPT_VERSION,
} from "@/modules/llm/prompt";
import { sanitizeUserQuestion, validateQuestionLength } from "@/modules/llm/safety";
import { postProcessAnswer } from "@/modules/llm/postprocess";
import { config } from "@/config";

const router = Router();
router.use(requireAuth);
router.use(rateLimitByUser);

const askSchema = z.object({
  documentId: z.string().uuid(),
  question: z.string(),
});

/**
 * The AI interaction endpoint. Stages are deliberately kept visible and
 * sequential rather than hidden behind one "askAI()" call, so each
 * responsibility (sanitize input -> retrieve context -> build prompt ->
 * invoke model -> post-process -> persist) can be reasoned about, tested,
 * and swapped independently.
 */
router.post("/ask", async (req: AuthenticatedRequest, res: Response) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "documentId and question are required." });
  }
  const { documentId, question } = parsed.data;
  const userId = req.userId!;

  const document = await getDocumentOwnedByUser(documentId, userId);
  if (!document) {
    return res.status(404).json({ error: "Document not found." });
  }
  if (document.status !== "ready") {
    return res.status(409).json({ error: `Document is not ready yet (status: ${document.status}).` });
  }

  // 1. Input validation & prompt-injection screening
  const lengthError = validateQuestionLength(question);
  if (lengthError) return res.status(400).json({ error: lengthError });

  const { sanitized, flagged } = sanitizeUserQuestion(question);
  if (flagged) {
    // Not a hard block (false positives are common and annoying), but
    // logged for audit and visible to the model via the system prompt's
    // instruction to treat context/instructions-in-input as untrusted.
    console.warn(`Possible prompt injection attempt from user ${userId}: "${sanitized}"`);
  }

  const provider = getLLMProvider();

  // 2. Retrieval (RAG)
  const questionEmbedding = await provider.embed(sanitized);
  const relevantChunks = await retrieveRelevantChunks(documentId, questionEmbedding);

  // 3. Prompt construction (versioned, isolated from the call itself)
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ question: sanitized, contextChunks: relevantChunks });

  // 4. Model invocation
  const completion = await provider.complete({
    systemPrompt,
    userPrompt,
    maxTokens: config.rateLimit.maxTokensPerRequest,
  });

  // 5. Post-processing
  const processed = postProcessAnswer(completion);

  // 6. Persistence (both turns, for history + auditability)
  await pool.query(
    `INSERT INTO chat_messages (document_id, user_id, role, content, prompt_version, model)
     VALUES ($1, $2, 'user', $3, $4, $5)`,
    [documentId, userId, sanitized, QA_PROMPT_VERSION, completion.model]
  );
  await pool.query(
    `INSERT INTO chat_messages (document_id, user_id, role, content, prompt_version, model)
     VALUES ($1, $2, 'assistant', $3, $4, $5)`,
    [documentId, userId, processed.answer, QA_PROMPT_VERSION, completion.model]
  );

  return res.json({
    answer: processed.answer,
    citedExcerpts: processed.citedExcerpts,
    lowConfidence: processed.lowConfidence,
    tokensUsed: processed.tokensUsed,
    model: completion.model,
  });
});

router.get("/:documentId/history", async (req: AuthenticatedRequest, res: Response) => {
  const { documentId } = req.params;
  const userId = req.userId!;

  const document = await getDocumentOwnedByUser(documentId, userId);
  if (!document) {
    return res.status(404).json({ error: "Document not found." });
  }

  const result = await pool.query(
    `SELECT role, content, created_at FROM chat_messages
     WHERE document_id = $1 AND user_id = $2
     ORDER BY created_at ASC`,
    [documentId, userId]
  );
  return res.json({ messages: result.rows });
});

export const chatRouter = router;
