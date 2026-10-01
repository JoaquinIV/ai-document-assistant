import { pool } from "@/db/pool";

/**
 * Minimal, dependency-free migration runner.
 * For a real production system this would be replaced by a proper
 * migration tool (node-pg-migrate, Prisma Migrate, etc.), but for the
 * scope of this assessment a single idempotent script is clearer to read.
 */
const statements = [
  `CREATE EXTENSION IF NOT EXISTS vector;`,

  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`,

  `CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing', -- processing | ready | failed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`,

  // Chunks hold the embeddable text + its vector. 1536 dims matches
  // OpenAI's text-embedding-3-small; the mock provider also outputs
  // vectors of this length so the schema doesn't change when switching providers.
  `CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`,

  `CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx
    ON document_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);`,

  // Chat history is retained so a user can see prior Q&A per document.
  // Retention policy is discussed in README (data handling section).
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user' | 'assistant'
    content TEXT NOT NULL,
    prompt_version TEXT,
    model TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );`,
];

async function migrate() {
  const client = await pool.connect();
  try {
    for (const statement of statements) {
      await client.query(statement);
    }
    console.log(`Migration complete: ${statements.length} statements applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
