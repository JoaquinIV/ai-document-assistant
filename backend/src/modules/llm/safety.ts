/**
 * Defense-in-depth against prompt injection. None of these alone is
 * bulletproof — the real mitigation is architectural (see buildSystemPrompt:
 * context is framed as untrusted data, never as instructions), but these
 * catch the cheap, common cases and cap abuse before it reaches the model.
 */

const SUSPICIOUS_PATTERNS = [
  /ignore (all|previous|the) instructions/i,
  /you are now/i,
  /system prompt/i,
  /disregard (all|previous) (rules|instructions)/i,
  /act as (if|a)/i,
];

export interface SanitizeResult {
  sanitized: string;
  flagged: boolean;
}

export function sanitizeUserQuestion(raw: string): SanitizeResult {
  const trimmed = raw.trim().slice(0, 2000); // hard length cap
  const flagged = SUSPICIOUS_PATTERNS.some((p) => p.test(trimmed));
  return { sanitized: trimmed, flagged };
}

export function validateQuestionLength(question: string): string | null {
  if (question.length === 0) return "Question cannot be empty.";
  if (question.length > 2000) return "Question is too long (max 2000 characters).";
  return null;
}
