import { describe, it, expect, vi } from "vitest";
import { AgentSideConnection } from "@agentclientprotocol/sdk";
import { ToolResultBlockParam } from "@anthropic-ai/sdk/resources";
import {
  BetaMCPToolResultBlock,
  BetaTextBlock,
  BetaWebSearchResultBlock,
  BetaWebSearchToolResultBlock,
  BetaBashCodeExecutionToolResultBlock,
  BetaBashCodeExecutionResultBlock,
} from "@anthropic-ai/sdk/resources/beta.mjs";
import { toAcpNotifications, ToolUseCache, Logger } from "../acp-agent.js";
import { createPostToolUseHook } from "../tools.js";

describe("rawOutput in tool call updates", () => {
  const mockClient = {} as AgentSideConnection;
  const mockLogger: Logger = { log: () => {}, error: () => {} };

  it("should include rawOutput with string content for tool_result", () => {
    const toolUseCache: ToolUseCache = {
      toolu_123: {
        type: "tool_use",
        id: "toolu_123",
        name: "Bash",
        input: { command: "echo hello" },
      },
    };

    const toolResult: ToolResultBlockParam = {
      type: "tool_result",
      tool_use_id: "toolu_123",
      content: "hello\n",
      is_error: false,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call_update",
      toolCallId: "toolu_123",
      status: "completed",
      rawOutput: "hello\n",
    });
  });

  it("should include rawOutput with array content for tool_result", () => {
    const toolUseCache: ToolUseCache = {
      toolu_456: {
        type: "tool_use",
        id: "toolu_456",
        name: "Read",
        input: { file_path: "/test/file.txt" },
      },
    };

    // ToolResultBlockParam content can be string or array of TextBlockParam
    const toolResult: ToolResultBlockParam = {
      type: "tool_result",
      tool_use_id: "toolu_456",
      content: [{ type: "text", text: "Line 1\nLine 2\nLine 3" }],
      is_error: false,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call_update",
      toolCallId: "toolu_456",
      status: "completed",
      rawOutput: [{ type: "text", text: "Line 1\nLine 2\nLine 3" }],
    });
  });

  it("should include rawOutput for mcp_tool_result with string content", () => {
    const toolUseCache: ToolUseCache = {
      toolu_789: {
        type: "tool_use",
        id: "toolu_789",
        name: "mcp__server__tool",
        input: { query: "test" },
      },
    };

    // BetaMCPToolResultBlock content can be string or Array<BetaTextBlock>
    const toolResult: BetaMCPToolResultBlock = {
      type: "mcp_tool_result",
      tool_use_id: "toolu_789",
      content: '{"result": "success", "data": [1, 2, 3]}',
      is_error: false,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call_update",
      toolCallId: "toolu_789",
      status: "completed",
      rawOutput: '{"result": "success", "data": [1, 2, 3]}',
    });
  });

  it("should include rawOutput for mcp_tool_result with array content", () => {
    const toolUseCache: ToolUseCache = {
      toolu_abc: {
        type: "tool_use",
        id: "toolu_abc",
        name: "mcp__server__search",
        input: { term: "test" },
      },
    };

    // BetaTextBlock requires citations field
    const arrayContent: BetaTextBlock[] = [
      { type: "text", text: "Result 1", citations: null },
      { type: "text", text: "Result 2", citations: null },
    ];

    const toolResult: BetaMCPToolResultBlock = {
      type: "mcp_tool_result",
      tool_use_id: "toolu_abc",
      content: arrayContent,
      is_error: false,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call_update",
      toolCallId: "toolu_abc",
      status: "completed",
      rawOutput: arrayContent,
    });
  });

  it("should include rawOutput for web_search_tool_result", () => {
    const toolUseCache: ToolUseCache = {
      toolu_web: {
        type: "tool_use",
        id: "toolu_web",
        name: "WebSearch",
        input: { query: "test search" },
      },
    };

    // BetaWebSearchResultBlock from SDK
    const searchResults: BetaWebSearchResultBlock[] = [
      {
        type: "web_search_result",
        url: "https://example.com",
        title: "Example",
        encrypted_content: "encrypted content here",
        page_age: "2 days ago",
      },
    ];

    const toolResult: BetaWebSearchToolResultBlock = {
      type: "web_search_tool_result",
      tool_use_id: "toolu_web",
      content: searchResults,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call_update",
      toolCallId: "toolu_web",
      status: "completed",
      rawOutput: searchResults,
    });
  });

  it("should include rawOutput for bash_code_execution_tool_result", () => {
    const toolUseCache: ToolUseCache = {
      toolu_bash: {
        type: "tool_use",
        id: "toolu_bash",
        name: "Bash",
        input: { command: "ls -la" },
      },
    };

    // BetaBashCodeExecutionResultBlock from SDK
    const bashResult: BetaBashCodeExecutionResultBlock = {
      type: "bash_code_execution_result",
      stdout: "file1.txt\nfile2.txt",
      stderr: "",
      return_code: 0,
      content: [],
    };

    const toolResult: BetaBashCodeExecutionToolResultBlock = {
      type: "bash_code_execution_tool_result",
      tool_use_id: "toolu_bash",
      content: bashResult,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call_update",
      toolCallId: "toolu_bash",
      status: "completed",
      rawOutput: bashResult,
    });
  });

  it("should keep background Task tool call in progress and include task metadata", () => {
    const toolUseCache: ToolUseCache = {
      toolu_bg: {
        type: "tool_use",
        id: "toolu_bg",
        name: "Task",
        input: {
          description: "Run checks in background",
          run_in_background: true,
        },
      },
    };

    const toolResult: ToolResultBlockParam = {
      type: "tool_result",
      tool_use_id: "toolu_bg",
      content:
        'Background task started.\n{"task_id":"task_abc123","output_file":"/tmp/task-abc123.log"}',
      is_error: false,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call_update",
      toolCallId: "toolu_bg",
      status: "in_progress",
      _meta: {
        claudeCode: {
          toolName: "Task",
          backgroundTaskId: "task_abc123",
          backgroundOutputFile: "/tmp/task-abc123.log",
        },
      },
    });
  });

  it("should extract background task metadata from tagged output", () => {
    const toolUseCache: ToolUseCache = {
      toolu_bg_tags: {
        type: "tool_use",
        id: "toolu_bg_tags",
        name: "Agent",
        input: {
          description: "Run agent in background",
          run_in_background: true,
        },
      },
    };

    const toolResult: ToolResultBlockParam = {
      type: "tool_result",
      tool_use_id: "toolu_bg_tags",
      content:
        "<background-task-output>Running in background</background-task-output>\n<task-id>task_xyz789</task-id>\n<output-file>/tmp/task-xyz789.log</output-file>",
      is_error: false,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call_update",
      toolCallId: "toolu_bg_tags",
      status: "in_progress",
      _meta: {
        claudeCode: {
          toolName: "Agent",
          backgroundTaskId: "task_xyz789",
          backgroundOutputFile: "/tmp/task-xyz789.log",
        },
      },
    });
  });

  it("should annotate foreground subagent tool calls with subagent label", () => {
    const toolUseCache: ToolUseCache = {
      toolu_parent: {
        type: "tool_use",
        id: "toolu_parent",
        name: "Task",
        input: {
          description: "Explore packages",
          prompt: "Inspect package boundaries and dependencies.",
          subagent_type: "Explore",
        },
      },
    };

    const notifications = toAcpNotifications(
      [
        {
          type: "tool_use",
          id: "toolu_child_read",
          name: "Read",
          input: { file_path: "/tmp/example.ts" },
        } as any,
      ],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
      { registerHooks: false, parentToolUseId: "toolu_parent" },
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call",
      toolCallId: "toolu_child_read",
      title: "[Explore#toolu_parent] Read File",
      _meta: {
        claudeCode: {
          toolName: "Read",
          parentToolUseId: "toolu_parent",
          subagentType: "Explore",
          subagentLabel: "Explore#toolu_parent",
        },
      },
    });
  });

  it("should include subagent context metadata on foreground tool results", () => {
    const toolUseCache: ToolUseCache = {
      toolu_parent: {
        type: "tool_use",
        id: "toolu_parent",
        name: "Task",
        input: {
          description: "Explore packages",
          prompt: "Inspect package boundaries and dependencies.",
          subagent_type: "Explore",
        },
      },
      toolu_child_read: {
        type: "tool_use",
        id: "toolu_child_read",
        name: "Read",
        input: { file_path: "/tmp/example.ts" },
      },
    };

    const toolResult: ToolResultBlockParam = {
      type: "tool_result",
      tool_use_id: "toolu_child_read",
      content: "export const value = 1;\n",
      is_error: false,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
      { registerHooks: false, parentToolUseId: "toolu_parent" },
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call_update",
      toolCallId: "toolu_child_read",
      status: "completed",
      _meta: {
        claudeCode: {
          toolName: "Read",
          parentToolUseId: "toolu_parent",
          subagentType: "Explore",
          subagentLabel: "Explore#toolu_parent",
        },
      },
    });
  });

  it("should set status to failed when is_error is true", () => {
    const toolUseCache: ToolUseCache = {
      toolu_err: {
        type: "tool_use",
        id: "toolu_err",
        name: "Bash",
        input: { command: "invalid_command" },
      },
    };

    const toolResult: ToolResultBlockParam = {
      type: "tool_result",
      tool_use_id: "toolu_err",
      content: "command not found: invalid_command",
      is_error: true,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(1);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "tool_call_update",
      toolCallId: "toolu_err",
      status: "failed",
      rawOutput: "command not found: invalid_command",
    });
  });

  it("should not emit tool_call_update for TodoWrite (emits plan instead)", () => {
    const toolUseCache: ToolUseCache = {
      toolu_todo: {
        type: "tool_use",
        id: "toolu_todo",
        name: "TodoWrite",
        input: { todos: [{ content: "Test task", status: "pending" }] },
      },
    };

    const toolResult: ToolResultBlockParam = {
      type: "tool_result",
      tool_use_id: "toolu_todo",
      content: "Todos updated successfully",
      is_error: false,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    // TodoWrite should not emit tool_call_update - it emits plan updates instead
    expect(notifications).toHaveLength(0);
  });

  it("should not emit tool_call_update for mcp__acp__TodoWrite (emits plan instead)", () => {
    const toolUseCache: ToolUseCache = {
      toolu_todo_wrapper: {
        type: "tool_use",
        id: "toolu_todo_wrapper",
        name: "mcp__acp__TodoWrite",
        input: { todos: [{ content: "Wrapper task", status: "pending" }] },
      },
    };

    const toolResult: ToolResultBlockParam = {
      type: "tool_result",
      tool_use_id: "toolu_todo_wrapper",
      content: "Todos updated successfully",
      is_error: false,
    };

    const notifications = toAcpNotifications(
      [toolResult],
      "assistant",
      "test-session",
      toolUseCache,
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(0);
  });

  it("should surface redacted_thinking and compaction blocks", () => {
    const notifications = toAcpNotifications(
      [
        { type: "redacted_thinking", data: "..." },
        { type: "compaction", content: "Compacted summary" },
      ] as any,
      "assistant",
      "test-session",
      {},
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(2);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "agent_thought_chunk",
      content: { type: "text", text: "[redacted thinking]" },
    });
    expect(notifications[1].update).toMatchObject({
      sessionUpdate: "agent_thought_chunk",
      content: { type: "text", text: "Compacted summary" },
    });
  });

  it("should surface container_upload, document, and search_result blocks", () => {
    const notifications = toAcpNotifications(
      [
        { type: "container_upload", file_id: "file_123" },
        { type: "document", title: "Architecture Notes" },
        { type: "search_result", title: "API docs", source: "internal-search" },
      ] as any,
      "assistant",
      "test-session",
      {},
      mockClient,
      mockLogger,
    );

    expect(notifications).toHaveLength(3);
    expect(notifications[0].update).toMatchObject({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "Container upload: file_123" },
    });
    expect(notifications[1].update).toMatchObject({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "[document] Architecture Notes" },
    });
    expect(notifications[2].update).toMatchObject({
      sessionUpdate: "agent_message_chunk",
      content: { type: "text", text: "[search] API docs (internal-search)" },
    });
  });

  it("should route TaskCompleted hooks to callback", async () => {
    const onTaskCompleted = vi.fn(async () => {});
    const hook = createPostToolUseHook(mockLogger, { onTaskCompleted });

    const result = await hook(
      {
        hook_event_name: "TaskCompleted",
        session_id: "test-session",
        transcript_path: "/tmp/test-session.jsonl",
        cwd: "/tmp",
        task_id: "task_42",
        task_subject: "Explore core package",
        task_description: "Inspect architecture and dependencies",
        teammate_name: "Explore",
        team_name: "analysis",
      },
      undefined,
      { signal: new AbortController().signal },
    );

    expect(result).toEqual({ continue: true });
    expect(onTaskCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: "task_42",
        task_subject: "Explore core package",
        task_description: "Inspect architecture and dependencies",
        teammate_name: "Explore",
        team_name: "analysis",
      }),
    );
  });
});
