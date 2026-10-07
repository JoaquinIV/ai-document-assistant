import { config } from "@/config";
import {
  ChatCompletionRequest,
  ChatCompletionResult,
  LLMProvider,
} from "@/modules/llm/providers/types";

/**
 * Free, fully local provider backed by Ollama (https://ollama.com) — no API
 * key, no per-token billing, runs on the developer's own machine. Useful for
 * running this assessment end-to-end with real (if smaller/weaker) model
 * output instead of the mock provider's canned text, at zero cost.
 *
 * Dimension note: `document_chunks.embedding` is a fixed `vector(1536)`
 * column (sized for OpenAI's text-embedding-3-small, which the mock
 * provider also mimics). Ollama's embedding models output smaller vectors
 * (e.g. nomic-embed-text -> 768 dims). Rather than migrate the schema for a
 * dev-only provider, embeddings are right-padded with zeros to 1536 dims.
 * This is mathematically exact for cosine similarity (pgvector's `<=>`
 * operator): padding with zeros changes neither the dot product nor the
 * vector norm, so similarity scores are unaffected — it only works because
 * every embedding in this deployment is padded the same way, so comparisons
 * stay apples-to-apples.
 */
const EMBEDDING_DIM = 1536;

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";
  private baseUrl = config.llm.ollamaBaseUrl;

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.llm.ollamaChatModel,
          stream: false,
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: request.userPrompt },
          ],
          options: {
            num_predict: request.maxTokens,
            temperature: request.temperature ?? 0.2,
          },
        }),
      });
    } catch (err) {
      throw new Error(
        `Could not reach Ollama at ${this.baseUrl}. Is "ollama serve" running ` +
          `and is "${config.llm.ollamaChatModel}" pulled? (${(err as Error).message})`
      );
    }

    if (!response.ok) {
      throw new Error(`Ollama chat request failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as {
      message: { content: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    return {
      text: body.message.content,
      usage: {
        promptTokens: body.prompt_eval_count ?? 0,
        completionTokens: body.eval_count ?? 0,
      },
      model: config.llm.ollamaChatModel,
    };
  }

  async embed(text: string): Promise<number[]> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.llm.ollamaEmbedModel, prompt: text }),
      });
    } catch (err) {
      throw new Error(
        `Could not reach Ollama at ${this.baseUrl}. Is "ollama serve" running ` +
          `and is "${config.llm.ollamaEmbedModel}" pulled? (${(err as Error).message})`
      );
    }

    if (!response.ok) {
      throw new Error(`Ollama embeddings request failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as { embedding: number[] };
    return padToFixedDimension(body.embedding, EMBEDDING_DIM);
  }
}

function padToFixedDimension(vector: number[], targetDim: number): number[] {
  if (vector.length === targetDim) return vector;
  if (vector.length > targetDim) {
    throw new Error(
      `Ollama embedding model "${config.llm.ollamaEmbedModel}" produced ${vector.length} ` +
        `dims, which exceeds the fixed column size of ${targetDim}. Pick a smaller-dimension ` +
        `embedding model, or raise document_chunks.embedding's vector size in migrate.ts.`
    );
  }
  return [...vector, ...new Array(targetDim - vector.length).fill(0)];
}
