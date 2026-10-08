# AI Support Ticket Agent Workspace

An enterprise-ready, stateful AI-powered customer support triage application built natively on the **Cloudflare Developer Platform**. The application seamlessly dynamically classifies user intent, fields common product questions using a built-in FAQ knowledge store, and triages complex issues using a structured state machine to generate support tickets into an atomic queue workspace.

---

## 🚀 Key Assignment Features Implemented
* **LLM Core Logic:** Built with `Llama 3.3 (70B)` executing on **Cloudflare Workers AI** optimizing fast classification.
* **Coordination & Workflows:** State management orchestrated natively via **Cloudflare Durable Objects** with transactional atomic persistence.
* **Historical Memory:** Permanent cross-session storage tracking conversation metadata profiles and custom triage states.
* **User Workspace UI:** High-density, three-pane real-time dashboard served using **Cloudflare Static Assets**.

---

## 📁 Decoupled Modular Project Architecture

The codebase avoids monolithic anti-patterns by isolating knowledge domains, configuration, storage, and agents into explicit module domains:

```text
├── public/
│   └── index.html               # Frontend static bundle workspace layout
├── src/
│   ├── agents/
│   │   └── chatSession.ts       # Per-conversation LLM triage state engine
│   ├── storage/
│   │   └── userTickets.ts       # Long-term user profile & ticket registry
│   ├── resources/
│   │   ├── faq.ts               # Product documentation text asset lookup
│   │   └── prompts.ts           # System directives & JSON payload contexts
│   ├── utils/
│   │   └── parser.ts            # Sanitized non-regex JSON processing utility
│   ├── types.ts                 # Shared global TypeScript definitions
│   └── index.ts                 # Central HTTP execution entrypoint router
└── wrangler.json                # Cloudflare infrastructure binding manifest
```

---

## 🛠️ Local Installation & Development

### 1. Pre-requisites
Ensure you have Node.js installed, then initialize your global npm dependencies inside the project root:
```bash
npm install wrangler --save-dev
```

### 2. Infrastructure Configuration (`wrangler.json`)
Verify your `wrangler.json` matches the exact unified platform assets standard below:
```json
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "ticket-agent",
	"main": "src/index.ts",
	"compatibility_date": "2026-10-06",
	"observability": {
		"enabled": true
	},
	"upload_source_maps": true,
	"ai": {
		"binding": "AI"
	},
	"assets": {
		"directory": "./public"
	},
	"durable_objects": {
		"bindings": [
			{ "name": "CHAT_SESSION", "class_name": "ChatSession" },
			{ "name": "USER_TICKETS", "class_name": "UserTickets" }
		]
	},
	"migrations": [
		{ "tag": "v1", "new_sqlite_classes": ["ChatSession"] },
		{ "tag": "v2", "new_sqlite_classes": ["UserTickets"] }
	]
}
```

### 3. Running the Local Cluster
To run the local server environment, initialize the development worker while forcing wrangler to drop stale directories and start with a fresh SQLite simulation cache:
```bash
npx wrangler dev --drop-dir
```
Wrangler will spin up a local development cluster instance reachable at **`http://localhost:8787`**.

---

## ⚙️ How the State Machine Handles Core Logic

1. **Intent Classification Loop:** Incoming user queries are dynamically screened through `CLASSIFY_SYSTEM_PROMPT` to route messages as a `question`, an `issue`, or `other` (greetings/chitchat).
2. **Deterministic FAQ Match:** `question` intents look up direct answers out of `src/resources/faq.ts`, resolving simple configuration queries instantly without engineering tickets.
3. **Structured Issue Triage:** `issue` intents trigger a conversation data processing model (`TRIAGE_SYSTEM_PROMPT`). The agent keeps track of clarifying follow-up constraints up to a maximum threshold of 2 attempts.
4. **Graceful Early-Exit Protection:** If the user states that an issue was resolved or opts out mid-interaction, the engine triggers a conditional exit hook (`resolved` | `cancelled`), updating database states cleanly without generating accidental tickets.
5. **Workspace Injection:** If all constraints pass, a ticket is permanently pushed into the `UserTickets` storage database registry with contextual priority flags (`high` | `medium` | `low`), instantly appearing on the ticket workspace timeline feed.

---

## 🧪 Operational Testing Matrix

Open `http://localhost:8787` in a web browser to evaluate core operational state flows:

| Test Scenario | Input Sequence | Expected Workspace Reaction |
| :--- | :--- | :--- |
| **FAQ Processing** | *"How do I reset my password?"* | Bot returns matching text out of the FAQ dictionary without appending cards. |
| **Ticket Gathering Phase** | *"My database connection is timed out."* | Agent detects an issue intent and asks a clarifying question (Follow-Up 1). |
| **Complete Triage Loop** | *"I tried pooling, it still fails on API pools."* | The agent compiles data, maps context, creates ticket `TCK-1` with `high` priority. |
| **Early-Exit Resolution** | *"Nevermind, I fixed the redirect typo."* | Agent parses state token as `resolved`, switches mode to `idle`, cancels ticket creation. |
| **Historical Session Restore**| Click on an older card link in the **History sidebar**. | Current workspace clear-swaps and renders previous interaction logs in read-only view. |
