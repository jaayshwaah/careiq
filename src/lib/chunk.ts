// Simple, fast chunker: split on paragraphs, then pack to ~1500 chars with ~200 char overlap
export type TextChunk = { idx: number; content: string; tokens?: number };

export function chunkText(raw: string, maxChars = 1500, overlap = 200): TextChunk[] {
  const clean = (raw || "").replace(/\r/g, "");
  const paras = clean.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);

  const chunks: TextChunk[] = [];
  let buf = "";
  let idx = 0;

  for (const p of paras) {
    if ((buf + (buf ? "\n\n" : "") + p).length <= maxChars) {
      buf += (buf ? "\n\n" : "") + p;
      continue;
    }
    if (buf) {
      chunks.push({ idx: idx++, content: buf });
    }
    // start new buffer; include small overlap from previous
    const overlapText = buf.slice(-overlap);
    buf = (overlapText ? overlapText + "\n\n" : "") + p;

    // If current paragraph is huge, hard-slice it
    while (buf.length > maxChars) {
      chunks.push({ idx: idx++, content: buf.slice(0, maxChars) });
      buf = buf.slice(maxChars - overlap);
    }
  }

  if (buf.trim()) chunks.push({ idx: idx++, content: buf });

  return chunks;
}
