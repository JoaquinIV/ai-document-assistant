import { ChatCompletionResult } from "@/modules/llm/providers/types";

export interface ProcessedAnswer {
  answer: string;
  citedExcerpts: number[];
  tokensUsed: number;
  lowConfidence: boolean;
}

const UNCERTAINTY_MARKERS = [
  "don't have enough information",
  "do not have enough information",
  "cannot answer",
  "not contained in the context",
];

/**
 * Turns a raw provider result into something the API/frontend can trust:
 * strips the excerpt citations into a structured field, and flags
 * low-confidence / "I don't know" answers so the UI can render them
 * differently instead of presenting a guess as fact.
 */
export function postProcessAnswer(result: ChatCompletionResult): ProcessedAnswer {
  const citedExcerpts = Array.from(
    result.text.matchAll(/\[Excerpt (\d+)\]/g)
  ).map((m) => Number(m[1]));

  const lowConfidence = UNCERTAINTY_MARKERS.some((marker) =>
    result.text.toLowerCase().includes(marker)
  );

  return {
    answer: result.text.trim(),
    citedExcerpts: [...new Set(citedExcerpts)],
    tokensUsed: result.usage.promptTokens + result.usage.completionTokens,
    lowConfidence,
  };
}
