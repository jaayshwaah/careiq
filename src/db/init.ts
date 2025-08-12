import { sql } from "./client";

/** Create tables/indexes if they don't exist. Safe to call multiple times. */
export async function ensureSchema() {
  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'New Chat',
      user_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_message_at TIMESTAMPTZ
    );
  `;

  await sql/* sql */`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql/* sql */`
    CREATE INDEX IF NOT EXISTS messages_chat_created_idx
      ON messages (chat_id, created_at);
  `;

  await sql/* sql */`
    CREATE INDEX IF NOT EXISTS chats_last_idx
      ON chats ((COALESCE(last_message_at, updated_at)));
  `;

  await sql/* sql */`
    CREATE INDEX IF NOT EXISTS chats_title_lwr_idx
      ON chats (LOWER(title));
  `;
}
