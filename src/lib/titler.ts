// src/lib/titler.ts - resilient, cheap auto-titling
import { scrubPHI } from "@/lib/privacy/scrub";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TITLE_MODELS = [
  "google/gemini-flash-1.5",        // Cheapest option first
  "openai/gpt-4o-mini",             // Fallback 1
  "anthropic/claude-3-haiku",       // Fallback 2
] as const;

export type TitlerInput = {
  userText: string;
  assistantText: string;
  targetLang?: string;
  timeoutMs?: number;
};

function collapseLongCode(s: string): string {
  // Collapse fenced code blocks longer than ~200 chars
  return s.replace(/```[\s\S]*?```/g, (block) => {
    const inner = block.slice(3, -3);
    if (inner.length > 200) return "(code omitted)";
    return block;
  });
}

function stripPII(s: string): string {
  const { cleaned } = scrubPHI(s);
  // basic emails/phones again (non-PHI contexts)
  return cleaned
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "account")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "phone");
}

function prep(text: string): string {
  let t = String(text || "").slice(0, 2000);
  t = collapseLongCode(t);
  t = stripPII(t);
  return t.trim();
}

// Simple in-memory cache to avoid re-titling identical content
const titleCache = new Map<string, { title: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(userText: string, assistantText: string): string {
  return Buffer.from(`${prep(userText)}|${prep(assistantText)}`).toString('base64').slice(0, 64);
}

export async function generateTitle({ userText, assistantText, targetLang, timeoutMs = 1500 }: TitlerInput) {
  // Check cache first
  const cacheKey = getCacheKey(userText, assistantText);
  const cached = titleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.title;
  }

  // Early exit for very short content
  const cleanUser = prep(userText);
  const cleanAssistant = prep(assistantText);
  if (cleanUser.length < 10 || cleanAssistant.length < 10) {
    return "New Chat";
  }

  const system = `You generate concise conversation titles.

Requirements:
- 4 to 8 words. No quotes. No emojis. No trailing punctuation.
- Capture the main task or topic, not a generic "Chat with AI".
- Use the user's language detected from the messages; if unclear, use English.
- Remove any personal identifiers (names, emails, phone numbers).
- Prefer noun phrases or imperatives.
- If content is only greetings or too vague, output: "New Chat".`;

  const bodyBase = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: `User:\n${cleanUser}\n\nAssistant:\n${cleanAssistant}` },
    ],
    temperature: 0.1,
    max_tokens: 20, // Reduced from 24 to save costs
    provider: { allow_fallbacks: true },
  } as any;

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs); // Reduced timeout

  for (const model of TITLE_MODELS) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${OPENROUTER_API_KEY}`, 
          "Content-Type": "application/json",
          "X-Title": "careiq-chat-titling" // Help with cost tracking
        },
        body: JSON.stringify({ model, ...bodyBase }),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      const raw = (json?.choices?.[0]?.message?.content || "").trim();
      const title = sanitizeTitle(raw);
      clearTimeout(to);
      
      if (title) {
        // Cache successful result
        titleCache.set(cacheKey, { title, timestamp: Date.now() });
        
        // Clean old cache entries (simple cleanup)
        if (titleCache.size > 1000) {
          const cutoff = Date.now() - CACHE_TTL;
          for (const [key, value] of titleCache.entries()) {
            if (value.timestamp < cutoff) {
              titleCache.delete(key);
            }
          }
        }
        
        return title;
      }
    } catch (e) {
      // Continue to next model
    }
  }
  clearTimeout(to);
  
  // Fallback: simple keyword extraction for common healthcare terms
  const fallbackTitle = extractHealthcareTitle(cleanUser, cleanAssistant);
  if (fallbackTitle) {
    titleCache.set(cacheKey, { title: fallbackTitle, timestamp: Date.now() });
    return fallbackTitle;
  }
  
  return "New Chat";
}

function extractHealthcareTitle(userText: string, assistantText: string): string {
  const combined = `${userText} ${assistantText}`.toLowerCase();
  
  // Healthcare-specific patterns for fallback titling
  const patterns = [
    { regex: /ppd|per patient day|staffing ratio/i, title: "PPD Calculation" },
    { regex: /daily round|rounding|unit management/i, title: "Daily Rounds" },
    { regex: /schedule|staffing|shift/i, title: "Schedule Management" },
    { regex: /census|resident count|bed count/i, title: "Census Analysis" },
    { regex: /survey|cms|compliance|audit/i, title: "Survey Preparation" },
    { regex: /medication|med pass|pharmacy/i, title: "Medication Management" },
    { regex: /care plan|treatment plan|assessment/i, title: "Care Planning" },
    { regex: /incident|fall|accident|report/i, title: "Incident Report" },
    { regex: /quality|indicator|measure/i, title: "Quality Metrics" },
    { regex: /documentation|chart|record/i, title: "Documentation Help" },
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(combined)) {
      return pattern.title;
    }
  }
  
  // Extract meaningful keywords if no patterns match
  const keywords = combined
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 3 && !/^(what|how|can|you|help|please|thanks?|hello|hi)$/i.test(word))
    .slice(0, 3);
    
  if (keywords.length >= 2) {
    return keywords.map((word, i) => 
      i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
    ).join(" ");
  }
  
  return "";
}

export function sanitizeTitle(input: string) {
  let s = String(input || "");
  s = s.split("\n")[0].trim();
  s = s.replace(/^(["'`""]+)|(["'`""]+)$/g, "");
  s = s.replace(/[.!?…]+$/g, "");
  if (s.length > 65) s = s.slice(0, 65).trim();
  // cheap pii
  s = s.replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "account");
  s = s.replace(/\+?\d[\d\s().-]{7,}\d/g, "phone");
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 3) return "";
  return s;
}

