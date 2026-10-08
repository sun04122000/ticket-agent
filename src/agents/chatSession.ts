import { DurableObject } from "cloudflare:workers";
import { Msg, Priority, Mode, Ticket } from "../types";
import { parseJson } from "../utils/parser";
import { FAQ } from "../resources/faq";
import { CLASSIFY_SYSTEM_PROMPT, TRIAGE_SYSTEM_PROMPT, GENERAL_AGENT_PROMPT } from "../resources/prompts";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_FOLLOWUPS = 2;

export class ChatSession extends DurableObject<Env> {
  private userTickets(userId: string) {
    return this.env.USER_TICKETS.get(this.env.USER_TICKETS.idFromName(userId));
  }

  private async llm(system: string, messages: Msg[]): Promise<string> {
    const result: any = await this.env.AI.run(MODEL, {
      messages: [{ role: "system", content: system }, ...messages],
    });
    return result.response;
  }

  private transcript(h: Msg[]) {
    return h.slice(-8).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
  }

  private async classify(history: Msg[]): Promise<"question" | "issue" | "other"> {
    const raw = await this.llm(CLASSIFY_SYSTEM_PROMPT, [{ role: "user", content: this.transcript(history) }]);
    const { intent } = parseJson<{ intent: string }>(raw, { intent: "other" });
    return intent === "question" || intent === "issue" ? intent : "other";
  }

  private async answerFromFaq(history: Msg[]): Promise<string> {
    return this.llm(`You are a support assistant. Answer ONLY using this FAQ. Be concise.\nIf the answer is not in the FAQ, say you are not sure and offer to create a support ticket.\nFAQ:\n${FAQ}`, history);
  }

  private async handleIssue(history: Msg[], userId: string, conversationId: string): Promise<string> {
    const followUps = (await this.ctx.storage.get<number>("followUps")) ?? 0;
    const raw = await this.llm(TRIAGE_SYSTEM_PROMPT, [{ role: "user", content: this.transcript(history) }]);

    // Updated fallback schema configuration matching our new prompt variables
    const data = parseJson<{
        ready: boolean;
        status: "triage" | "resolved" | "cancelled";
        followUp: string;
        title: string;
        summary: string;
        priority: Priority;
    }>(raw, { 
        ready: false, 
        status: "triage", 
        followUp: "Could you describe the problem in more detail?", 
        title: "", 
        summary: "", 
        priority: "medium" 
    });

    // Intercept 1: User resolved the issue yourself during chat
    if (data.status === "resolved") {
        await this.ctx.storage.put("mode", "idle" satisfies Mode);
        await this.ctx.storage.put("followUps", 0);
        return "I am glad to hear the issue is resolved! I won't open a support ticket for this. Let me know if anything else comes up.";
    }

    // Intercept 2: User explicitly opted out of ticket creation
    if (data.status === "cancelled") {
        await this.ctx.storage.put("mode", "idle" satisfies Mode);
        await this.ctx.storage.put("followUps", 0);
        return "Understood. I have cancelled the ticket creation process. Let me know if you need help with anything else!";
    }

    // Standard path: Still gathering facts
    if (!data.ready && followUps < MAX_FOLLOWUPS) {
        await this.ctx.storage.put("mode", "gathering" satisfies Mode);
        await this.ctx.storage.put("followUps", followUps + 1);
        return data.followUp;
    }

    // Standard path: Fully ready to build and document the issue
    const ticket = await this.userTickets(userId).add({
        title: data.title || "Support request",
        summary: data.summary || this.transcript(history),
        priority: ["low", "medium", "high"].includes(data.priority) ? data.priority : "medium",
        createdAt: new Date().toISOString(),
        conversationId,
    });

    await this.ctx.storage.put("mode", "idle" satisfies Mode);
    await this.ctx.storage.put("followUps", 0);

    return `I've created ticket ${ticket.id} ("${ticket.title}") with ${ticket.priority} priority. Our team will follow up within 1 business day.`;
}


  async getHistory(): Promise<Msg[]> {
    return (await this.ctx.storage.get<Msg[]>("history")) ?? [];
  }

  async chat(message: string, userId: string, conversationId: string): Promise<{ reply: string; intent: string; tickets: Ticket[] }> {
    const history = (await this.ctx.storage.get<Msg[]>("history")) ?? [];
    history.push({ role: "user", content: message });

    const mode = (await this.ctx.storage.get<Mode>("mode")) ?? "idle";
    const intent = mode === "gathering" ? "issue" : await this.classify(history);

    const reply =
      intent === "question" ? await this.answerFromFaq(history)
      : intent === "issue" ? await this.handleIssue(history, userId, conversationId)
      : await this.llm(GENERAL_AGENT_PROMPT, history);

    history.push({ role: "assistant", content: reply });
    await this.ctx.storage.put("history", history);

    return { reply, intent, tickets: await this.userTickets(userId).list() };
  }
}
