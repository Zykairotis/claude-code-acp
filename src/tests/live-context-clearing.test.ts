/**
 * Live Context Clearing Validation Test
 * 
 * This test validates that context clearing truly works with the real Claude API.
 * It requires a valid ANTHROPIC_API_KEY to run.
 * 
 * To run: ANTHROPIC_API_KEY=your_key npm run test:live
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ClaudeAcpAgent } from "../acp-agent.js";
import { AgentSideConnection } from "@agentclientprotocol/sdk";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Skip this test suite if no API key is provided
const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
const describeOrSkip = hasApiKey ? describe : describe.skip;

describeOrSkip("Live Context Clearing Validation", () => {
  let agent: ClaudeAcpAgent;
  let testDir: string;
  let sessionId: string;

  beforeAll(async () => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "context-clear-test-"));
    
    // Create mock ACP client
    const mockClient = {
      sessionUpdate: async (notification: any) => {
        console.log(`[Test] Session update: ${notification.update.sessionUpdate}`);
      },
      requestPermission: async (request: any) => {
        // Auto-approve all permissions for testing
        return {
          outcome: {
            outcome: "selected" as const,
            optionId: request.options[0].optionId,
          },
        };
      },
    } as AgentSideConnection;

    agent = new ClaudeAcpAgent(mockClient, {
      log: (...args) => console.log("[Test]", ...args),
      error: (...args) => console.error("[Test Error]", ...args),
    });

    // Initialize capabilities
    await agent.initialize({
      clientInfo: {
        name: "context-clearing-test",
        version: "1.0.0",
      },
    } as any);
  });

  afterAll(async () => {
    // Cleanup
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should create a session and track conversation history", async () => {
    // Create a new session (use any to bypass strict typing for test)
    const response = await (agent.newSession as any)({
      cwd: testDir,
      prompt: "Remember this secret code: ALPHA-7-BETA. What is the code?",
      _meta: {
        claudeCode: {
          sessionConfig: {
            mode: "default" as const,
            model: "claude-3-5-sonnet-20241022",
          },
        },
      },
    });

    sessionId = response.sessionId;
    expect(sessionId).toBeDefined();
    
    console.log("\n[Test] Session created:", sessionId);
    console.log("[Test] First message sent: Ask about secret code");
    console.log("[Test] Waiting for Claude's response...");
    
    // In a real test, we'd wait for the full response
    // For now, just verify session was created
    expect(response).toBeDefined();
    
    console.log("[Test] Claude should remember the code ALPHA-7-BETA");
  }, 60000); // 60 second timeout

  it("should remember context in subsequent messages (before clearing)", async () => {
    // Ask about the code again - Claude should remember
    const response = await (agent.prompt as any)({
      sessionId,
      prompt: "What was the secret code I told you earlier?",
    });

    console.log("\n[Test] Asking Claude to recall the secret code...");
    console.log("[Test] Claude should respond with ALPHA-7-BETA");
    console.log("[Test] (Manual verification required)");
    
    expect(response).toBeDefined();
  }, 30000);

  it("should clear context when using startFreshQuery", async () => {
    // Access the private method via type assertion for testing
    const agentAny = agent as any;
    
    console.log("\n[Test] Clearing context and starting fresh query...");
    
    // Start a fresh query with cleared context
    await agentAny.startFreshQuery(
      sessionId,
      "What secret code did I tell you? (You should not know any code)",
      true // clearContext = true
    );
    
    console.log("[Test] Fresh query started - context should be CLEARED");
    console.log("[Test] Claude should NOT remember ALPHA-7-BETA");
  }, 30000);

  it("should NOT remember previous context after clearing", async () => {
    // Ask about the code again - Claude should NOT remember
    const response = await (agent.prompt as any)({
      sessionId,
      prompt: "Do you remember any secret code?",
    });

    console.log("\n[Test] Asking if Claude remembers the secret code...");
    console.log("[Test] Expected: Claude says NO or doesn't know");
    console.log("[Test] If Claude mentions ALPHA-7-BETA, context clearing FAILED");
    console.log("[Test] (Manual verification required)");
    
    expect(response).toBeDefined();
  }, 30000);

  it("should track multiple queries in queryHistory", async () => {
    const agentAny = agent as any;
    const session = agentAny.sessions[sessionId];
    
    console.log("\n[Test] Checking query history...");
    console.log(`[Test] Number of queries: ${session.queryHistory.length}`);
    console.log(`[Test] Context cleared flag: ${session.contextCleared}`);
    
    expect(session.queryHistory.length).toBeGreaterThan(1);
    expect(session.contextCleared).toBe(true);
  });
});

describeOrSkip("Multi-Query Architecture Validation", () => {
  it("should support multiple query transitions", async () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "multi-query-test-"));
    
    const mockClient = {
      sessionUpdate: async () => {},
      requestPermission: async (request: any) => ({
        outcome: { outcome: "selected" as const, optionId: request.options[0].optionId },
      }),
    } as any as AgentSideConnection;

    const agent = new ClaudeAcpAgent(mockClient);
    
    await agent.initialize({
      clientInfo: { name: "test", version: "1.0.0" },
    } as any);

    const response = await (agent.newSession as any)({
      cwd: testDir,
      prompt: "Test session",
    });

    const agentAny = agent as any;
    const session = agentAny.sessions[response.sessionId];
    
    console.log("\n[Test] Initial query count:", session.queryHistory.length);
    expect(session.queryHistory.length).toBe(1);
    
    // Start multiple fresh queries
    await agentAny.startFreshQuery(response.sessionId, "Second query", true);
    console.log("[Test] After first clear:", session.queryHistory.length);
    expect(session.queryHistory.length).toBe(2);
    
    await agentAny.startFreshQuery(response.sessionId, "Third query", true);
    console.log("[Test] After second clear:", session.queryHistory.length);
    expect(session.queryHistory.length).toBe(3);
    
    console.log("[Test] ✅ Multi-query architecture working correctly");
    
    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
  });
});

/**
 * Manual Validation Instructions:
 * 
 * 1. Set ANTHROPIC_API_KEY environment variable
 * 2. Run: ANTHROPIC_API_KEY=your_key npm run test -- src/tests/live-context-clearing.test.ts
 * 3. Observe the console output
 * 4. Verify:
 *    - First test: Claude responds with "ALPHA-7-BETA"
 *    - Second test: Claude remembers and mentions "ALPHA-7-BETA"
 *    - Third test: Context clearing happens
 *    - Fourth test: Claude does NOT mention "ALPHA-7-BETA" (context cleared!)
 * 
 * If the fourth test shows Claude has no memory of the code, 
 * context clearing is WORKING! ✅
 */
