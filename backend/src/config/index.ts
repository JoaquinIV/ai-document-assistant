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
    provider: (process.env.LLM_PROVIDER ?? "mock") as "openai" | "mock",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  },

  rateLimit: {
    maxRequestsPerMinutePerUser: Number(
      process.env.MAX_REQUESTS_PER_MINUTE_PER_USER ?? 10
    ),
    maxTokensPerRequest: Number(process.env.MAX_TOKENS_PER_REQUEST ?? 2000),
  },
} as const;
