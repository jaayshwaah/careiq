// src/lib/knowledge/parse.ts
// IMPORTANT: lazy-import heavy/native deps to avoid build-time execution in Next.js.

export async function parseDocxToText(buffer: Buffer): Promise<string> {
  // Lazy import mammoth on demand
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value || "";
}

export async function parsePdfToText(buffer: Buffer): Promise<string> {
  // Lazy import pdf-parse on demand
  const mod = await import("pdf-parse");
  const pdf = (mod as any).default || mod;
  const data = await pdf(buffer);
  return data?.text || "";
}
