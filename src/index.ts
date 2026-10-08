import { ChatSession } from "./agents/chatSession";
import { UserTickets } from "./storage/userTickets";

export { ChatSession, UserTickets };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/chat" && request.method === "POST") {
      const body = (await request.json().catch(() => null)) as any;
      const message = body?.message?.trim();
      
      if (!message || !body?.userId || !body?.sessionId) {
        return Response.json({ error: "message, userId, and sessionId are required" }, { status: 400 });
      }

      const sid = body.sessionId;
      const userStub = env.USER_TICKETS.get(env.USER_TICKETS.idFromName(body.userId));
      await userStub.trackSession(sid, message);

      const stub = env.CHAT_SESSION.get(env.CHAT_SESSION.idFromName(sid));
      const res = await stub.chat(message, body.userId, sid);
      return Response.json({ sessionId: sid, ...res });
    }

    if (url.pathname === "/tickets" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
      const stub = env.USER_TICKETS.get(env.USER_TICKETS.idFromName(userId));
      return Response.json(await stub.list());
    }

    if (url.pathname === "/history" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
      const stub = env.USER_TICKETS.get(env.USER_TICKETS.idFromName(userId));
      return Response.json({ sessions: await stub.getSessions() });
    }

    if (url.pathname === "/history/view" && request.method === "GET") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) return Response.json({ error: "sessionId required" }, { status: 400 });
      const stub = env.CHAT_SESSION.get(env.CHAT_SESSION.idFromName(sessionId));
      return Response.json({ history: await stub.getHistory() });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
