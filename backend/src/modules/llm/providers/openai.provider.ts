import OpenAI from "openai";
import { config } from "@/config";
import {
  ChatCompletionRequest,
  ChatCompletionResult,
  LLMProvider,
} from "@/modules/llm/providers/types";

/**
 * Real provider. Talks to OpenAI's API. Kept thin on purpose — all prompt
 * logic lives in modules/llm/prompt.ts, not here. This file only knows how
 * to turn a (system, user) pair into a completion, and text into a vector.
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor() {
    if (!config.llm.openaiApiKey) {
      throw new Error(
        "OPENAI_API_KEY is required when LLM_PROVIDER=openai"
      );
    }
    this.client = new OpenAI({ apiKey: config.llm.openaiApiKey });
  }

  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: config.llm.openaiModel,
      max_tokens: request.maxTokens,
      temperature: request.temperature ?? 0.2,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
    });

    const choice = response.choices[0];
    return {
      text: choice.message.content ?? "",
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      },
      model: response.model,
    };
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }
}
