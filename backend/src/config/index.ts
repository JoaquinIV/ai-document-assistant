import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),

  jwt: {
    secret: required("JWT_SECRET", "dev-secret-change-me"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "24h",
  },

  db: {
    url: required("DATABASE_URL"),
  },

  llm: {
    provider: (process.env.LLM_PROVIDER ?? "mock") as
      | "openai"
      | "ollama"
      | "mock",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    // Ollama: free, local inference — no API key, no per-token cost.
    // See providers/ollama.provider.ts for the embedding-dimension note.
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    ollamaChatModel: process.env.OLLAMA_CHAT_MODEL ?? "llama3.2:1b",
    ollamaEmbedModel: process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text",
  },

  rateLimit: {
    maxRequestsPerMinutePerUser: Number(
      process.env.MAX_REQUESTS_PER_MINUTE_PER_USER ?? 10
    ),
    maxTokensPerRequest: Number(process.env.MAX_TOKENS_PER_REQUEST ?? 2000),
  },
} as const;
