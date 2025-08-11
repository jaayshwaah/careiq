export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface Chat {
  id: string;
  title?: string;
  createdAt: number;
  messages: Message[];
}
