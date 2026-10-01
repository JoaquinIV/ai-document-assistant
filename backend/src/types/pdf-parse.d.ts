declare module "pdf-parse" {
  interface PDFParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  function pdfParse(buffer: Buffer): Promise<PDFParseResult>;
  export default pdfParse;
}
