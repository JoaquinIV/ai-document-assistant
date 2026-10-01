import {
  ChatCompletionRequest,
  ChatCompletionResult,
  LLMProvider,
} from "@/modules/llm/providers/types";

/**
 * Deterministic, zero-cost provider used for local dev, tests, and running
 * this assessment without an API key. It mirrors the OpenAI provider's
 * contract exactly, so switching LLM_PROVIDER=openai|mock requires no
 * change anywhere else in the codebase.
 */
export class MockProvider implements LLMProvider {
  readonly name = "mock";

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    // Echo-style response that still demonstrates the RAG context was used,
    // so the frontend has something meaningful to render end-to-end.
    const contextPreview = request.userPrompt.slice(0, 300);
    return {
      text:
        `[mock-llm] Based on the provided context, here is a synthesized answer.\n\n` +
        `Context received (truncated): "${contextPreview}..."\n\n` +
        `To get real answers, set LLM_PROVIDER=openai and OPENAI_API_KEY in .env.`,
      usage: {
        promptTokens: Math.ceil(request.userPrompt.length / 4),
        completionTokens: 40,
      },
      model: "mock-v1",
    };
  }

  async embed(text: string): Promise<number[]> {
    // Deterministic pseudo-embedding (hash-based) so semantic search is at
    // least stable and repeatable in dev, without calling any external API.
    const dims = 1536;
    const vector = new Array(dims).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = text.charCodeAt(i) % dims;
      vector[idx] += 1;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / magnitude);
  }
}
