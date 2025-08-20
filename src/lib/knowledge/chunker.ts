export type Chunk = {
  title: string;
  content: string;
  metadata?: Record<string, any>;
};

const DEFAULT_CHARS = 1200;
const DEFAULT_OVERLAP = 150;

export function cleanText(s: string): string {
  return s
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(
  text: string,
  opts?: { title?: string; chunkSize?: number; overlap?: number; metadata?: Record<string, any> }
): Chunk[] {
  const title = opts?.title ?? "Untitled";
  const chunkSize = Math.max(256, Math.min(opts?.chunkSize ?? DEFAULT_CHARS, 4000));
  const overlap = Math.max(0, Math.min(opts?.overlap ?? DEFAULT_OVERLAP, Math.floor(chunkSize / 2)));
  const metadata = opts?.metadata ?? {};

  const t = cleanText(text);
  if (t.length <= chunkSize) return [{ title, content: t, metadata }];

  const chunks: Chunk[] = [];
  let start = 0;
  while (start < t.length) {
    const end = Math.min(start + chunkSize, t.length);
    const content = t.slice(start, end);
    chunks.push({ title, content, metadata });
    if (end === t.length) break;
    start = end - overlap;
  }
  return chunks;
}