import { config } from "@/config";
import { LLMProvider } from "@/modules/llm/providers/types";
import { OpenAIProvider } from "@/modules/llm/providers/openai.provider";
import { OllamaProvider } from "@/modules/llm/providers/ollama.provider";
import { MockProvider } from "@/modules/llm/providers/mock.provider";

let cached: LLMProvider | null = null;

/**
 * Single switch point for "which LLM provider are we using". Everything
 * else in the app asks this factory for a provider instead of importing
 * OpenAIProvider/MockProvider directly — that's what makes provider
 * switching a one-line env var change instead of a code change.
 */
export function getLLMProvider(): LLMProvider {
  if (cached) return cached;

  switch (config.llm.provider) {
    case "openai":
      cached = new OpenAIProvider();
      break;
    case "ollama":
      cached = new OllamaProvider();
      break;
    case "mock":
    default:
      cached = new MockProvider();
      break;
  }
  return cached;
}
