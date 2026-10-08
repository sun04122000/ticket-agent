# Appendix: AI-Assisted Architecture & Prompt History

### **Overview**
This project was developed using an iterative, prompt-driven engineering approach. The engineering lifecycle moved through four core phases: **System Component Mapping**, **State Persistence Expansion**, **System Component Decoupling**, and **Deterministic State-Machine Bug Triage**. 

Below is the chronological log of major prompt sequences used to design, refactor, and finalize the application on the Cloudflare Developer Platform.

---

### **Phase 1: Initial System Architecture & Component Mapping**
**Intent:** Establishing the structural blueprint of the project to cleanly map the specific requirements of the assignment to native Cloudflare primitives.

#### **Prompt submitted to AI Assistant:**
> "I plan to build an AI-powered Ticket Support and Triage System. Given the exact terms of my assignment:
> * **LLM:** Recommend using Llama 3.3 on Workers AI.
> * **Workflow / Coordination:** Recommend using Workflows, Workers or Durable Objects.
> * **User Input:** Chat interface.
> * **Memory or State:** Stateful storage tracking.
> 
> Help me design and develop this project step-by-step. Keep the implementation lightweight, highly scannable, and structured in a way that allows me to clearly explain how each Cloudflare component talks to the other without over-complicating the code."

#### **Architectural Decisions Derived:**
* **Compute / Edge Router:** A serverless Cloudflare Worker (`src/index.ts`) handling incoming REST endpoints.
* **Coordination & Memory Layers:** Two isolated **Durable Objects (DO)** classes to ensure atomicity: `ChatSession` for ephemeral, conversation-specific agent state, and `UserTickets` to act as the long-term, cross-session user profile database.
* **Inference Layer:** Cloudflare **Workers AI** executing `@cf/meta/llama-3.3-70b-instruct-fp8-fast` for sub-second intent classification and structural triage parsing.
* **User Interface Layer:** **Cloudflare Static Assets** serving a responsive three-pane layout instantly from a target `./public` directory.

---

### **Phase 2: Feature Iteration & State Expansion**
**Intent:** Enhancing user experience by scaling the state-tracking footprint to include conversation histories alongside active workspace contexts.

#### **Prompt submitted to AI Assistant:**
> "The core chat is functioning, but I need to expand the state engine. Modify the system to persist older conversations as well when we click to start a new chat. On the frontend workspace layout, build a side panel showing the active list of older sessions, and allow clicking them to cleanly re-populate the chat workspace with its historical logs. Ensure that user tickets remain globally accessible regardless of which chat session is actively selected."

#### **Engineering Enhancements Implemented:**
* Decoupled session listing from `ChatSession` and transferred the session tracking arrays securely into the long-lived `UserTickets` Durable Object.
* Implemented specific `/history` and `/history/view` API endpoints on the backend router.
* Expanded the frontend client from a 2-column view to a high-density **3-column layout** (Session History Sidebar, Live Tickets Feed, Active Chat Area).

---

### **Phase 3: System Component Decoupling (Refactoring)**
**Intent:** Transitioning from a single-file design pattern into a clean, enterprise-ready modular folder hierarchy before final packaging.

#### **Prompt submitted to AI Assistant:**
> "The project is running well, but everything is currently lumped into a single monolithic script file. Let's refactor this code to follow a clean directory structure. Move the agent code into an `agents/` directory, storage into `storage/`, and create explicit files under `resources/` for system prompts and FAQs. Isolate the JSON formatting code into a utility folder. This will keep my codebase enterprise-ready and maintainable."

#### **Resulting Structure:**
* Organized modules into clean domains: `src/agents/chatSession.ts`, `src/storage/userTickets.ts`, `src/resources/prompts.ts`, and `src/utils/parser.ts`.
* Eliminated problematic, fragile inline RegExp parsing loops by engineering an index-based substring extractor (`substring(firstOpen, lastClose)`) that safely processes text variables returned from deep LLM inferences.

---

### **Phase 4: State Machine Edge-Case Debugging**
**Intent:** Resolving a deterministic logical bug where the agent continuously generated tickets even if the customer explicitly stated that their issue was fixed.

#### **Prompt submitted to AI Assistant:**
> "I updated my triage system prompt to tell the agent not to create a support ticket if the user explicitly says their issue is resolved. However, it is still creating a ticket anyway. Here is my current prompt:
> 
> `Don't create ticket if user says issue resolved or they don't want to create a ticket.`
> 
> The backend code automatically triggers a ticket write loop whenever the LLM passes back `ready: true`. Since a resolved conversation means no more questions are needed, the LLM marks it as 'ready', which accidentally fires our internal write method. Help me fix this state machine."

#### **Root-Cause Analysis & Final Fix:**
* **The Bug:** A clash between the LLM's prompt instructions and the backend's strict state flags (`ready: true` was conflated with "ticket is complete").
* **The Resolution:** Enhanced the LLM's output JSON payload schema to explicitly pass a new variable named `"status": "triage" | "resolved" | "cancelled"`. The backend agent code was rewritten to intercept this status token, allowing it to gracefully clear memory buffers and display a success message *instead* of executing an accidental ticket generation write.

---

### **Summary of Final Project Tech-Stack Alignment**
1. **User Input:** Native HTML5/JavaScript Event Streams communicating via serverless async payload requests.
2. **LLM Reasoning:** `Llama 3.3 (70B)` executing on **Cloudflare Workers AI**, optimizing prompt contexts for high-speed intent routing.
3. **Coordination & Workflows:** State isolation achieved natively using **Cloudflare Durable Objects**, exploiting transactional atomic persistence for both live conversation spaces and permanent account profiles.
4. **Memory / State:** Permanent and ephemeral state handling with zero configuration using the Cloudflare Durable Object storage engine API.
