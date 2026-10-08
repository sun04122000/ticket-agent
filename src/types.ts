export type Msg = { role: "system" | "user" | "assistant"; content: string };
export type Priority = "low" | "medium" | "high";
export type Mode = "idle" | "gathering";

export interface Ticket {
  id: string;
  title: string;
  summary: string;
  priority: Priority;
  createdAt: string;
  conversationId: string;
}

export interface SessionMeta {
  id: string;
  title: string;
}
