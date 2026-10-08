import { DurableObject } from "cloudflare:workers";
import { Ticket, SessionMeta } from "../types";

export class UserTickets extends DurableObject<Env> {
  async add(t: Omit<Ticket, "id">): Promise<Ticket> {
    const tickets = (await this.ctx.storage.get<Ticket[]>("tickets")) ?? [];
    const ticket: Ticket = { ...t, id: `TCK-${tickets.length + 1}` };
    tickets.push(ticket);
    await this.ctx.storage.put("tickets", tickets);
    return ticket;
  }

  async list(): Promise<Ticket[]> {
    return (await this.ctx.storage.get<Ticket[]>("tickets")) ?? [];
  }

  async trackSession(sessionId: string, firstMessage: string): Promise<void> {
    const sessions = (await this.ctx.storage.get<SessionMeta[]>("sessions")) ?? [];
    const exists = sessions.some(s => s.id === sessionId);
    
    if (!exists) {
      const shortTitle = firstMessage.length > 25 ? firstMessage.substring(0, 25) + "..." : firstMessage;
      sessions.push({ id: sessionId, title: shortTitle });
      await this.ctx.storage.put("sessions", sessions);
    }
  }

  async getSessions(): Promise<SessionMeta[]> {
    return (await this.ctx.storage.get<SessionMeta[]>("sessions")) ?? [];
  }
}
