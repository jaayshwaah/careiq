// src/lib/title.ts
/** Utilities to create ChatGPT-style chat titles from the first user message. */

/** Remove URLs, markdown code, and junky whitespace. */
function sanitize(raw: string): string {
  let s = (raw || "").trim();

  // Remove fenced code blocks and inline code
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`[^`]*`/g, " ");

  // Remove URLs
  s = s.replace(/\bhttps?:\/\/\S+/gi, " ");
  s = s.replace(/\bwww\.\S+/gi, " ");

  // Remove emoji and most symbols that don’t help titles
  s = s.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\u24C2|[\uD83C-\uDBFF\uDC00-\uDFFF])/g,
    " "
  );

  // Collapse whitespace and stray punctuation
  s = s.replace(/\s+/g, " ").replace(/[•·–—]+/g, "-").trim();

  return s;
}

/** Title-case lightly without shouting acronyms or breaking proper nouns too hard. */
function gentleTitleCase(s: string): string {
  const small = new Set([
    "a",
    "an",
    "and",
    "at",
    "but",
    "by",
    "for",
    "in",
    "nor",
    "of",
    "on",
    "or",
    "the",
    "to",
    "vs",
    "via",
  ]);
  return s
    .split(" ")
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && small.has(lower)) return lower;
      // keep acronyms
      if (word.length <= 4 && word === word.toUpperCase()) return word;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function generateChatTitle(
  firstUserMessage: string | null | undefined,
  fallback = "New chat"
): string {
  if (!firstUserMessage) return fallback;

  let s = sanitize(firstUserMessage);

  // If nothing meaningful remains, fall back
  if (!s) return fallback;

  // Prefer the first sentence/clause for intent-like titles
  const firstStop = s.search(/[.!?]/);
  if (firstStop > 10) {
    s = s.slice(0, firstStop);
  }

  // Trim to ~32 characters like ChatGPT (slightly flexible)
  const MAX = 32;
  if (s.length > MAX) {
    // try to cut on a word boundary
    const cut = s.slice(0, MAX + 1);
    const lastSpace = cut.lastIndexOf(" ");
    s = cut.slice(0, Math.max(16, lastSpace)).trim() + "…";
  }

  // De-punctuate edges
  s = s.replace(/^[^A-Za-z0-9]+/, "").replace(/[^A-Za-z0-9…]+$/, "");

  // Title case lightly
  s = gentleTitleCase(s);

  // Make sure we have something human
  if (!s) return fallback;

  return s;
}
