/**
 * Provider-agnostic contracts. Anything above this layer (prompt building,
 * post-processing, routes) depends only on these interfaces — never on a
 * concrete vendor SDK. This is what makes the provider swappable.
 */

export interface ChatCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature?: number;
}

export interface ChatCompletionResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  model: string;
}

export interface LLMProvider {
  readonly name: string;
  complete(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
  embed(text: string): Promise<number[]>;
}
