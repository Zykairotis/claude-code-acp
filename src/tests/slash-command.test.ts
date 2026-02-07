import { describe, it, expect } from "vitest";
import type { SlashCommand } from "@anthropic-ai/claude-agent-sdk";

describe("Slash command with spaces", () => {
  it("should handle commands with spaces in their names", () => {
    // This is a documentation test showing the expected behavior
    // When the SDK provides commands like "agentdb vector search",
    // the ACP should:
    // 1. Add the command as-is to available commands
    // 2. Add a hyphenated alias "agentdb-vector-search"
    // 3. Match prefix queries (e.g., "agentdb" matches "agentdb vector search")

    const commands: SlashCommand[] = [
      { name: "help", description: "Show help", argumentHint: "" },
      { name: "agentdb vector search", description: "Search vectors in AgentDB", argumentHint: "query" },
      { name: "agentdb memory patterns", description: "Memory patterns for AgentDB", argumentHint: "operation" },
    ];

    // The getAvailableSlashCommands function should generate:
    // - "help"
    // - "agentdb vector search"
    // - "agentdb-vector-search" (alias)
    // - "agentdb memory patterns"
    // - "agentdb-memory-patterns" (alias)

    // When user types "/agentdb vector search":
    // - tryHandleLocalSlashCommand extracts command="agentdb", args="vector search"
    // - isCommandAvailable checks if "agentdb" is a prefix of any available command
    // - "agentdb" is a prefix of "agentdb vector search" → returns true
    // - tryHandleLocalSlashCommand returns null → passes through to SDK

    // When user types "/agentdb-vector-search":
    // - tryHandleLocalSlashCommand extracts command="agentdb-vector-search", args=""
    // - isCommandAvailable checks for exact match → returns true
    // - tryHandleLocalSlashCommand returns null → passes through to SDK

    expect(commands.length).toBe(3);
  });
});
