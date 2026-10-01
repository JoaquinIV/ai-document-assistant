import { pool } from "@/db/pool";
import { chunkText } from "@/modules/documents/chunking";
import { extractText } from "@/modules/documents/extractText";
import { getLLMProvider } from "@/modules/llm/provider.factory";

export interface Document {
  id: string;
  filename: string;
  status: "processing" | "ready" | "failed";
  createdAt: string;
}

/**
 * Orchestrates the ingestion pipeline: store the document row, extract
 * text, chunk it, embed each chunk, persist vectors. Runs synchronously
 * for simplicity here; in production this would be handed off to a
 * background worker/queue (see README "background async processing").
 */
export async function ingestDocument(params: {
  userId: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
}): Promise<Document> {
  const { userId, filename, contentType, buffer } = params;

  const insertResult = await pool.query(
    `INSERT INTO documents (user_id, filename, content_type, status)
     VALUES ($1, $2, $3, 'processing')
     RETURNING id, filename, status, created_at`,
    [userId, filename, contentType]
  );
  const doc = insertResult.rows[0];

  try {
    const text = await extractText(buffer, contentType);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error("Document produced no extractable text.");
    }

    const provider = getLLMProvider();

    // Sequential to keep this straightforward and avoid bursting the
    // embeddings API; a production pipeline would batch/parallelize
    // with bounded concurrency.
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await provider.embed(chunks[i]);
      await pool.query(
        `INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
         VALUES ($1, $2, $3, $4)`,
        [doc.id, i, chunks[i], toVectorLiteral(embedding)]
      );
    }

    await pool.query(`UPDATE documents SET status = 'ready' WHERE id = $1`, [doc.id]);
    return { ...doc, status: "ready" };
  } catch (err) {
    await pool.query(`UPDATE documents SET status = 'failed' WHERE id = $1`, [doc.id]);
    throw err;
  }
}

export async function listDocuments(userId: string): Promise<Document[]> {
  const result = await pool.query(
    `SELECT id, filename, status, created_at FROM documents
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function getDocumentOwnedByUser(
  documentId: string,
  userId: string
) {
  const result = await pool.query(
    `SELECT id, filename, status FROM documents WHERE id = $1 AND user_id = $2`,
    [documentId, userId]
  );
  return result.rows[0] ?? null;
}

/**
 * Retrieves the top-k most relevant chunks for a question via cosine
 * similarity (pgvector's <=> operator). This is the "R" in RAG.
 */
export async function retrieveRelevantChunks(
  documentId: string,
  questionEmbedding: number[],
  topK = 4
): Promise<{ index: number; content: string }[]> {
  const result = await pool.query(
    `SELECT chunk_index, content
     FROM document_chunks
     WHERE document_id = $1
     ORDER BY embedding <=> $2
     LIMIT $3`,
    [documentId, toVectorLiteral(questionEmbedding), topK]
  );
  return result.rows.map((r) => ({ index: r.chunk_index, content: r.content }));
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
