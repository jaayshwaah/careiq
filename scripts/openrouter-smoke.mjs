// scripts/openrouter-smoke.mjs
import dotenv from 'dotenv';
import OpenAI from 'openai';
import assert from 'node:assert/strict';

// Load .env.local first (Next.js local convention), then .env fallback
dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * Usage:
 *   node scripts/openrouter-smoke.mjs
 *   node scripts/openrouter-smoke.mjs x-ai/grok-4 "Draft a one-line agenda."
 *
 * Env (in .env.local or your shell):
 *   OPENROUTER_API_KEY=sk-or-xxxxxxxx
 */

function normalizeKey(raw) {
  if (!raw) return '';
  // Remove accidental "Bearer " prefix and surrounding quotes/whitespace
  return String(raw).replace(/^Bearer\s+/i, '').trim().replace(/^['"]|['"]$/g, '');
}

const rawKey = process.env.OPENROUTER_API_KEY;
const apiKey = normalizeKey(rawKey);

if (!apiKey) {
  console.error(
    'Missing OPENROUTER_API_KEY.\n' +
      'Add it to .env.local (recommended) or export it in your shell, e.g.:\n' +
      '  echo "OPENROUTER_API_KEY=sk-or-xxxxxxxx" >> .env.local\n'
  );
  process.exit(1);
}
if (!apiKey.startsWith('sk-or-')) {
  console.warn(
    `Warning: OPENROUTER_API_KEY does not start with "sk-or-". Double-check you used an OpenRouter key.\n` +
      `Masked preview: ${apiKey.slice(0, 6)}… (len ${apiKey.length})`
  );
}

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://careiq-eight.vercel.app',
    'X-Title': 'CareIQ Dev Smoke',
  },
});

const model = process.argv[2] || 'openai/gpt-5'; // try 'x-ai/grok-4' too
const userPrompt = process.argv[3] || 'Say hi in three words.';

async function preflight() {
  // Quick auth sanity check: list models
  const r = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://careiq-eight.vercel.app',
      'X-Title': 'CareIQ Dev Smoke',
    },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Preflight /models failed: HTTP ${r.status}\n${body}`);
  }
  const j = await r.json();
  assert(Array.isArray(j.data), 'Models response did not include data array');
  const names = j.data.slice(0, 5).map(m => m.id).join(', ');
  console.log('Preflight OK. Sample models:', names || '(none)');
}

async function runChat() {
  const res = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [{ role: 'user', content: userPrompt }],
  });
  console.log('Model:', model);
  console.log('Reply:', res.choices?.[0]?.message?.content ?? '(no content)');
}

try {
  await preflight();
  await runChat();
} catch (err) {
  console.error('Request failed:', err?.message || err);
  process.exit(1);
}
