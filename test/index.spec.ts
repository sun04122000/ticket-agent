import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
} from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";
import { parseJson } from "../src/utils/parser";

// Polyfill helper ensuring requests carry native type tracking
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("AI Ticket Agent System Test Suite", () => {

	// 1. Core Component Layer: Unit Testing the custom string extraction utility
	describe("JSON Utility String Engine Parser (Unit Tests)", () => {
		it("safely extracts JSON content wrapped inside conversational LLM text markup", () => {
			const rawLlmOutput = "Sure! Here is the JSON configuration you requested: \n```json\n{\"intent\":\"question\"}\n```\nHope that helps!";
			const result = parseJson(rawLlmOutput, { intent: "other" });
			
			expect(result).toEqual({ intent: "question" });
		});

		it("returns the exact fallback payload if the string block contains unparsable content", () => {
			const corruptedOutput = "This is completely broken and doesn't contain a JSON object string block.";
			const result = parseJson(corruptedOutput, { intent: "fallback_value" });
			
			expect(result).toEqual({ intent: "fallback_value" });
		});
	});

	// 2. Integration / Edge Router Layer: Testing endpoint behavior channels
	describe("Main Router Network Pipeline Gateway (Integration Tests)", () => {
		it("returns an HTTP 404 payload when hitting an unregistered router path", async () => {
			const request = new IncomingRequest("http://localhost/unregistered-endpoint-path");
			const ctx = createExecutionContext();
			
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(404);
			expect(await response.text()).toBe("Not Found");
		});

		it("blocks chat submission sequences if payload data parameters are missing", async () => {
			// Directly call worker.fetch with an empty body to trigger the 400 Bad Request validator
			const request = new IncomingRequest("http://localhost/chat", {
				method: "POST",
				body: JSON.stringify({}),
				headers: { "Content-Type": "application/json" }
			});
			const ctx = createExecutionContext();

			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			expect(response.status).toBe(400);
			const data: any = await response.json();
			expect(data.error).toContain("required");
		});
	});
});
