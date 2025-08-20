// src/lib/privacy/scrub.ts
// Lightweight PHI scrubbing (regex-based). Not perfect—aims to minimize egress risk.
const patterns: Array<[RegExp, string]> = [
  // SSN
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]"],
  // MRN-like (very naive): "MRN: 123456" / "#1234567"
  [/\b(MRN|Med\s*Rec(?:ord)?\s*#?)\s*[:#]?\s*\d{4,}\b/gi, "[MRN]"],
  // Phone numbers
  [/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE]"],
  // Emails
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]"],
  // Dates (many forms)
  [/\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})\b/gi, "[DATE]"],
  // Addresses (very rough)
  [/\b\d{1,5}\s+[A-Za-z0-9.\- ]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Lane|Ln|Dr|Drive|Ct|Court)\b/gi, "[ADDRESS]"],
  // Zip codes
  [/\b\d{5}(?:-\d{4})?\b/g, "[ZIP]"],
  // Names preceded by "Patient", "Resident", "Mr/Ms/Mrs Dr"
  [/\b(?:Patient|Resident|Mr|Ms|Mrs|Dr)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g, "[NAME]"],
];

export function scrubPHI(text: string): { cleaned: string; changed: boolean } {
  let out = text;
  for (const [re, repl] of patterns) out = out.replace(re, repl);
  return { cleaned: out, changed: out !== text };
}

export function likelyPHI(text: string): boolean {
  const probes = [/MRN/i, /\bSSN\b/i, /@/, /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i, /\d{3}-\d{2}-\d{4}/];
  return probes.some((r) => r.test(text));
}
