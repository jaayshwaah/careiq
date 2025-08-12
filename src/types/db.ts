export type ChatRow = {
  id: string;            // uuid
  title: string | null;  // text
  created_at: string;    // timestamptz
};

export type MessageRow = {
  id: string;            // uuid
  chat_id: string;       // uuid
  role: "user" | "assistant" | "system" | "tool";
  content: string;       // text
  created_at: string;    // timestamptz
};
