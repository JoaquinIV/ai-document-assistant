import pdfParse from "pdf-parse";

/**
 * Extracts plain text from the supported upload types. Isolated here so
 * adding a new content type (e.g. .docx) only touches this file.
 */
export async function extractText(
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (contentType === "application/pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  if (contentType === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported content type: ${contentType}`);
}
