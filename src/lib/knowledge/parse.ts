import mammoth from "mammoth";
import pdf from "pdf-parse";

export async function parseDocxToText(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value || "";
}

export async function parsePdfToText(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text || "";
}
