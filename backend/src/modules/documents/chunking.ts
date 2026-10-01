/**
 * Naive but effective fixed-size chunker with overlap. Good enough for
 * short-to-medium documents; a production system would likely switch to
 * semantic/recursive splitting (e.g. by paragraph/heading) for better
 * retrieval quality, but that's an optimization, not a correctness issue.
 */
export function chunkText(
  text: string,
  options: { chunkSize?: number; overlap?: number } = {}
): string[] {
  const chunkSize = options.chunkSize ?? 1000;
  const overlap = options.overlap ?? 150;

  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end === normalized.length) break;
    start = end - overlap;
  }
  return chunks;
}
