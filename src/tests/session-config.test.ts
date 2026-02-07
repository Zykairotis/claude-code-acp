import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { AgentSideConnection, SessionNotification } from "@agentclientprotocol/sdk";
import type { ClaudeAcpAgent as ClaudeAcpAgentType } from "../acp-agent.js";

const sdkMockState = vi.hoisted(() => {
  const queryCalls: Array<{ prompt: unknown; options: Record<string, unknown> | undefined }> = [];
  const queryInstances: Array<{
    next: ReturnType<typeof vi.fn>;
    setPermissionMode: ReturnType<typeof vi.fn>;
    setModel: ReturnType<typeof vi.fn>;
    setMaxThinkingTokens: ReturnType<typeof vi.fn>;
    setOutputStyle: ReturnType<typeof vi.fn>;
    supportedCommands: ReturnType<typeof vi.fn>;
    mcpServerStatus: ReturnType<typeof vi.fn>;
    accountInfo: ReturnType<typeof vi.fn>;
    reconnectMcpServer: ReturnType<typeof vi.fn>;
    toggleMcpServer: ReturnType<typeof vi.fn>;
    setMcpServers: ReturnType<typeof vi.fn>;
    streamInput: ReturnType<typeof vi.fn>;
    initializationResult: ReturnType<typeof vi.fn>;
    interrupt: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    enqueue: (messages: unknown[]) => void;
    [Symbol.asyncIterator]: () => unknown;
  }> = [];

  const initResult = {
    commands: [
      { name: "output-style:new", description: "Create output style" },
      { name: "compact", description: "Compact history" },
      { name: "cost", description: "Show cost" },
      { name: "login", description: "Log in" },
      { name: "logout", description: "Log out" },
      { name: "release-notes", description: "Show release notes" },
      { name: "todos", description: "Show todos" },
    ],
    output_style: "default",
    available_output_styles: ["default", "concise"],
    models: [
      {
        value: "default",
        displayName: "Default",
        description: "Default model",
      },
      {
        value: "claude-sonnet-4-5",
        displayName: "Claude Sonnet 4.5",
        description: "Strong coding model",
      },
    ],
    account: {
      email: "dev@example.com",
      organization: "Example Org",
      subscriptionType: "pro",
      tokenSource: "api_key",
      apiKeySource: "ANTHROPIC_API_KEY",
    },
  };

  function reset() {
    queryCalls.length = 0;
    queryInstances.length = 0;
  }

  function createQuery(params: { prompt: unknown; options?: Record<string, unknown> }) {
    const queue: unknown[] = [];
    queryCalls.push({ prompt: params.prompt, options: params.options });
    const instance = {
      next: vi.fn(async () => {
        if (queue.length > 0) {
          return { value: queue.shift(), done: false };
        }
        return { value: undefined, done: true };
      }),
      setPermissionMode: vi.fn(async () => {}),
      setModel: vi.fn(async () => {}),
      setMaxThinkingTokens: vi.fn(async () => {}),
      setOutputStyle: vi.fn(async () => {}),
      supportedCommands: vi.fn(async () => initResult.commands),
      mcpServerStatus: vi.fn(async () => [{ name: "acp", status: "connected" }]),
      accountInfo: vi.fn(async () => initResult.account),
      reconnectMcpServer: vi.fn(async () => {}),
      toggleMcpServer: vi.fn(async () => {}),
      setMcpServers: vi.fn(async () => ({ added: [], removed: [], errors: [] })),
      streamInput: vi.fn(async (_stream: AsyncIterable<unknown>) => {}),
      initializationResult: vi.fn(async () => initResult),
      interrupt: vi.fn(async () => {}),
      close: vi.fn(() => {}),
      enqueue(messages: unknown[]) {
        queue.push(...messages);
      },
      async return() {
        return { value: undefined, done: true };
      },
      async throw(error: unknown) {
        throw error;
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    queryInstances.push(instance);
    return instance;
  }

  return {
    createQuery,
    initResult,
    queryCalls,
    queryInstances,
    reset,
  };
});

vi.mock("@anthropic-ai/claude-agent-sdk", async () => {
  const actual = await vi.importActual<typeof import("@anthropic-ai/claude-agent-sdk")>(
    "@anthropic-ai/claude-agent-sdk",
  );
  return {
    ...actual,
    query: vi.fn((params: { prompt: unknown; options?: Record<string, unknown> }) =>
      sdkMockState.createQuery(params),
    ),
  };
});

describe("session config options", () => {
  let tempDir: string;
  let agent: ClaudeAcpAgentType;
  let ClaudeAcpAgent: typeof ClaudeAcpAgentType;
  let sessionUpdates: SessionNotification[];

  function createMockClient(
    requestPermissionImpl?: AgentSideConnection["requestPermission"],
  ): AgentSideConnection {
    return {
      sessionUpdate: async (notification: SessionNotification) => {
        sessionUpdates.push(notification);
      },
      requestPermission:
        requestPermissionImpl ?? (async () => ({ outcome: { outcome: "cancelled" } })),
      readTextFile: async () => ({ content: "" }),
      writeTextFile: async () => ({}),
    } as unknown as AgentSideConnection;
  }

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-session-config-"));
    sessionUpdates = [];
    sdkMockState.reset();
    vi.resetModules();
    const acpAgent = await import("../acp-agent.js");
    ClaudeAcpAgent = acpAgent.ClaudeAcpAgent;
    agent = new ClaudeAcpAgent(createMockClient());
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns configOptions from newSession and includes delegate/output style capabilities", async () => {
    const response = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const configIds = response.configOptions?.map((option) => option.id) ?? [];
    expect(configIds).toEqual(
      expect.arrayContaining([
        "mode",
        "model",
        "thought_level",
        "max_thinking_tokens",
        "output_style",
        "rewind_policy",
        "additional_directories",
        "allowed_tools",
        "disallowed_tools",
        "tools",
        "env",
        "enable_file_checkpointing",
        "persist_session",
        "max_turns",
        "max_budget_usd",
        "mcp_servers",
        "sandbox",
      ]),
    );

    const modeOption = response.configOptions?.find((option) => option.id === "mode");
    expect(modeOption).toBeDefined();
    expect(modeOption?.options).toContainEqual(
      expect.objectContaining({
        value: "delegate",
      }),
    );

    expect(response.modes?.availableModes.some((mode) => mode.id === "delegate")).toBe(true);

    const modelOption = response.configOptions?.find((option) => option.id === "model");
    expect(modelOption).toBeDefined();
    expect(Array.isArray(modelOption?.options)).toBe(true);
    expect((modelOption?.options as Array<Record<string, unknown>>)[0]).toHaveProperty("group");

    await new Promise((resolve) => setTimeout(resolve, 0));
    const availableCommandsUpdate = sessionUpdates.find(
      (update) => update.update.sessionUpdate === "available_commands_update",
    );
    expect(availableCommandsUpdate).toBeDefined();
    const availableCommands =
      availableCommandsUpdate?.update.sessionUpdate === "available_commands_update"
        ? availableCommandsUpdate.update.availableCommands
        : [];
    expect(availableCommands.some((command) => command.name === "output-style:new")).toBe(true);
    expect(
      ["cost", "login", "logout", "release-notes", "todos"].every((name) =>
        availableCommands.some((command) => command.name === name),
      ),
    ).toBe(true);

    expect(
      (response as { _meta?: { claudeCode?: { accountInfo?: { email?: string } } } })._meta,
    ).toMatchObject({
      claudeCode: {
        accountInfo: {
          email: "dev@example.com",
        },
      },
    });
  });

  it("supports setSessionConfigOption with validation and update notifications", async () => {
    const { sessionId } = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const mockQuery = sdkMockState.queryInstances[0]!;

    const modelResponse = await agent.setSessionConfigOption({
      sessionId,
      configId: "model",
      value: "claude-sonnet-4-5",
    });
    expect(mockQuery.setModel).toHaveBeenCalledWith("claude-sonnet-4-5");
    expect(modelResponse.configOptions.find((option) => option.id === "model")?.currentValue).toBe(
      "claude-sonnet-4-5",
    );

    await agent.setSessionConfigOption({
      sessionId,
      configId: "mode",
      value: "delegate",
    });
    expect(mockQuery.setPermissionMode).toHaveBeenCalledWith("delegate");
    expect(
      sessionUpdates.some(
        (update) =>
          update.update.sessionUpdate === "current_mode_update" &&
          update.update.currentModeId === "delegate",
      ),
    ).toBe(true);

    await agent.setSessionConfigOption({
      sessionId,
      configId: "thought_level",
      value: "high",
    });
    expect(mockQuery.setMaxThinkingTokens).toHaveBeenCalledWith(8192);

    await agent.setSessionConfigOption({
      sessionId,
      configId: "max_thinking_tokens",
      value: "1024",
    });
    expect(mockQuery.setMaxThinkingTokens).toHaveBeenCalledWith(1024);

    await agent.setSessionConfigOption({
      sessionId,
      configId: "output_style",
      value: "concise",
    });
    expect(mockQuery.setOutputStyle).toHaveBeenCalledWith("concise");

    const configUpdates = sessionUpdates.filter(
      (update) => update.update.sessionUpdate === "config_option_update",
    );
    expect(configUpdates.length).toBeGreaterThan(0);

    await expect(
      agent.setSessionConfigOption({
        sessionId,
        configId: "unknown-config",
        value: "x",
      }),
    ).rejects.toMatchObject({ code: -32602 });

    await expect(
      agent.setSessionConfigOption({
        sessionId,
        configId: "mode",
        value: "unknown-mode",
      }),
    ).rejects.toMatchObject({ code: -32602 });

    await expect(
      agent.setSessionConfigOption({
        sessionId,
        configId: "max_turns",
        value: "50",
      }),
    ).rejects.toMatchObject({ code: -32602 });
  });

  it("maps startup config options and rewind policy into SDK options", async () => {
    const response = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        claudeCode: {
          sessionConfig: {
            rewindPolicy: "native",
            additionalDirectories: [path.join(tempDir, "fixtures")],
            allowedTools: ["Read"],
            disallowedTools: ["Write"],
            tools: [],
            env: {
              FOO: "bar",
            },
            enableFileCheckpointing: false,
            persistSession: false,
            maxThinkingTokens: 2048,
            maxTurns: 25,
            maxBudgetUsd: 5,
            mcpServers: {
              custom: {
                type: "stdio",
                command: "node",
                args: ["custom.js"],
              },
            },
            sandbox: {
              enabled: true,
            },
          },
        },
      },
    });

    const queryOptions = sdkMockState.queryCalls[0]?.options ?? {};
    expect(queryOptions.enableFileCheckpointing).toBe(false);
    expect(queryOptions.persistSession).toBe(false);
    expect(queryOptions.maxThinkingTokens).toBe(2048);
    expect(queryOptions.maxTurns).toBe(25);
    expect(queryOptions.maxBudgetUsd).toBe(5);
    expect(queryOptions.additionalDirectories).toEqual([path.join(tempDir, "fixtures")]);
    expect(queryOptions.tools).toEqual([]);
    expect(queryOptions.env).toMatchObject({ FOO: "bar" });
    expect(queryOptions.sandbox).toMatchObject({ enabled: true });
    expect(queryOptions.hooks).toBeDefined();
    expect(Array.isArray((queryOptions.hooks as Record<string, unknown>).PostToolUse)).toBe(true);
    expect(Array.isArray((queryOptions.hooks as Record<string, unknown>).TaskCompleted)).toBe(true);

    const disallowedTools = Array.isArray(queryOptions.disallowedTools)
      ? (queryOptions.disallowedTools as string[])
      : [];
    expect(disallowedTools).toContain("mcp__acp__RewindFiles");
    expect(disallowedTools).not.toContain("RewindFiles");
    expect(disallowedTools).not.toContain("Read");
    expect(disallowedTools).toContain("Write");

    const configOptions = response.configOptions ?? [];
    expect(configOptions.find((option) => option.id === "rewind_policy")?.currentValue).toBe(
      "native",
    );
    expect(
      configOptions.find((option) => option.id === "enable_file_checkpointing")?.currentValue,
    ).toBe("disabled");
    expect(configOptions.find((option) => option.id === "persist_session")?.currentValue).toBe(
      "disabled",
    );
    expect(configOptions.find((option) => option.id === "max_turns")?.currentValue).toBe("25");
    expect(configOptions.find((option) => option.id === "max_budget_usd")?.currentValue).toBe("5");
    expect(configOptions.find((option) => option.id === "sandbox")?.currentValue).toBe("enabled");
  });

  it("does not auto-disallow native write/edit/bash tools when client capabilities are present", async () => {
    await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: false,
      },
    });

    const queryOptions = sdkMockState.queryCalls[0]?.options ?? {};
    const disallowedTools = Array.isArray(queryOptions.disallowedTools)
      ? (queryOptions.disallowedTools as string[])
      : [];

    expect(disallowedTools).not.toContain("Write");
    expect(disallowedTools).not.toContain("Edit");
    expect(disallowedTools).not.toContain("Bash");
    expect(disallowedTools).not.toContain("BashOutput");
    expect(disallowedTools).not.toContain("KillShell");
  });

  it("supports startup delegate mode, setSessionMode(delegate), and resume config options", async () => {
    const response = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
        claudeCode: {
          sessionConfig: {
            mode: "delegate",
          },
        },
      },
    });

    expect(response.modes?.currentModeId).toBe("delegate");
    expect(sdkMockState.queryCalls[0]?.options?.permissionMode).toBe("delegate");

    await agent.setSessionMode({
      sessionId: response.sessionId,
      modeId: "default",
    });
    await agent.setSessionMode({
      sessionId: response.sessionId,
      modeId: "delegate",
    });

    const query = sdkMockState.queryInstances[0]!;
    expect(query.setPermissionMode).toHaveBeenCalledWith("delegate");

    const resumeResponse = await agent.unstable_resumeSession({
      cwd: tempDir,
      mcpServers: [],
      sessionId: "existing-session-id",
      _meta: {
        disableBuiltInTools: true,
      },
    });
    expect(resumeResponse.configOptions).toBeDefined();
    expect(resumeResponse.configOptions?.length).toBeGreaterThan(0);
  });

  it("syncs config options during streaming and includes accountInfo in session metadata", async () => {
    const { sessionId } = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const query = sdkMockState.queryInstances[0]!;
    query.enqueue([
      {
        type: "system",
        subtype: "init",
        apiKeySource: "api_key",
        claude_code_version: "0.0.0-test",
        cwd: tempDir,
        tools: [],
        mcp_servers: [],
        model: "claude-sonnet-4-5",
        permissionMode: "delegate",
        slash_commands: ["output-style:new"],
        output_style: "concise",
        skills: [],
        plugins: [],
        uuid: "init-uuid",
        session_id: sessionId,
      },
      {
        type: "system",
        subtype: "status",
        status: null,
        permissionMode: "default",
        uuid: "status-uuid",
        session_id: sessionId,
      },
      {
        type: "result",
        subtype: "success",
        result: "ok",
        is_error: false,
        duration_ms: 1200,
        duration_api_ms: 800,
        num_turns: 1,
        stop_reason: "end_turn",
        total_cost_usd: 0.0123,
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          cache_read_input_tokens: 20,
          cache_creation_input_tokens: 1,
        },
        modelUsage: {
          default: {
            inputTokens: 10,
            outputTokens: 5,
            cacheReadInputTokens: 20,
            cacheCreationInputTokens: 1,
            webSearchRequests: 0,
            costUSD: 0.0123,
            contextWindow: 200000,
            maxOutputTokens: 8192,
          },
        },
        permission_denials: [],
        structured_output: {
          ok: true,
        },
        uuid: "result-uuid",
        session_id: sessionId,
      },
    ]);

    const promptResponse = await agent.prompt({
      sessionId,
      prompt: [
        {
          type: "text",
          text: "Hello",
        },
      ],
    });

    expect(promptResponse.stopReason).toBe("end_turn");
    expect(promptResponse.usage).toMatchObject({
      inputTokens: 10,
      outputTokens: 5,
    });
    expect(
      (
        promptResponse as {
          _meta?: { claudeCode?: { structuredOutput?: Record<string, unknown> } };
        }
      )._meta?.claudeCode?.structuredOutput,
    ).toEqual({
      ok: true,
    });
    expect(
      sessionUpdates.some(
        (update) =>
          update.update.sessionUpdate === "current_mode_update" &&
          update.update.currentModeId === "delegate",
      ),
    ).toBe(true);
    expect(
      sessionUpdates.some(
        (update) =>
          update.update.sessionUpdate === "current_mode_update" &&
          update.update.currentModeId === "default",
      ),
    ).toBe(true);

    const sessionInfoUpdate = sessionUpdates.find(
      (update) => update.update.sessionUpdate === "session_info_update",
    );
    expect(sessionInfoUpdate).toBeDefined();
    expect(
      (
        sessionInfoUpdate as {
          update: { _meta?: { claudeCode?: { accountInfo?: { email?: string } } } };
        }
      ).update._meta?.claudeCode?.accountInfo?.email,
    ).toBe("dev@example.com");

    const configUpdate = sessionUpdates.find(
      (update) => update.update.sessionUpdate === "config_option_update",
    );
    expect(configUpdate).toBeDefined();
    expect(
      configUpdate?.update.sessionUpdate === "config_option_update" &&
        configUpdate.update.configOptions.find((option) => option.id === "output_style")
          ?.currentValue,
    ).toBe("concise");

    const usageUpdate = sessionUpdates.find(
      (update) => update.update.sessionUpdate === "usage_update",
    );
    expect(usageUpdate).toBeDefined();
    expect(
      usageUpdate?.update.sessionUpdate === "usage_update" && usageUpdate.update.cost?.amount,
    ).toBe(0.0123);
    expect(
      usageUpdate?.update.sessionUpdate === "usage_update" &&
        usageUpdate.update.size >= usageUpdate.update.used,
    ).toBe(true);
  });

  it("exposes SDK MCP control methods via ACP extension methods", async () => {
    const { sessionId } = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const query = sdkMockState.queryInstances[0]!;

    await expect(
      agent.extMethod("mcpServerStatus", {
        sessionId,
      }),
    ).resolves.toEqual({
      mcpServers: [{ name: "acp", status: "connected" }],
    });
    expect(query.mcpServerStatus).toHaveBeenCalledTimes(1);

    await expect(
      agent.extMethod("reconnectMcpServer", {
        sessionId,
        serverName: "filesystem",
      }),
    ).resolves.toEqual({ ok: true });
    expect(query.reconnectMcpServer).toHaveBeenCalledWith("filesystem");

    await expect(
      agent.extMethod("toggleMcpServer", {
        sessionId,
        serverName: "filesystem",
        enabled: false,
      }),
    ).resolves.toEqual({ ok: true });
    expect(query.toggleMcpServer).toHaveBeenCalledWith("filesystem", false);

    await expect(
      agent.extMethod("setMcpServers", {
        sessionId,
        servers: {
          custom: {
            type: "stdio",
            command: "node",
            args: ["server.js"],
          },
        },
      }),
    ).resolves.toEqual({
      result: { added: [], removed: [], errors: [] },
      currentValue: "custom",
    });
    expect(query.setMcpServers).toHaveBeenCalledTimes(1);

    const mcpSelectorUpdate = sessionUpdates.find(
      (update) =>
        update.update.sessionUpdate === "config_option_update" &&
        update.update.configOptions.some(
          (option) => option.id === "mcp_servers" && option.currentValue === "custom",
        ),
    );
    expect(mcpSelectorUpdate).toBeDefined();
  });

  it("supports streamInput and refreshSessionInfo extension methods", async () => {
    const { sessionId } = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const query = sdkMockState.queryInstances[0]!;

    await expect(
      agent.extMethod("streamInput", {
        sessionId,
        text: "hello from streamInput",
      }),
    ).resolves.toEqual({ ok: true });
    expect(query.streamInput).toHaveBeenCalledTimes(1);

    await expect(
      agent.extMethod("streamInput", {
        sessionId,
      }),
    ).rejects.toMatchObject({ code: -32602 });

    await expect(
      agent.extMethod("refreshSessionInfo", {
        sessionId,
      }),
    ).resolves.toMatchObject({
      ok: true,
      accountInfo: {
        email: "dev@example.com",
      },
      mcpServers: [{ name: "acp", status: "connected" }],
    });
    expect(query.accountInfo).toHaveBeenCalledTimes(1);
    expect(
      sessionUpdates.some(
        (update) =>
          update.update.sessionUpdate === "session_info_update" &&
          (update.update._meta as { claudeCode?: { accountInfo?: { email?: string } } } | undefined)
            ?.claudeCode?.accountInfo?.email === "dev@example.com",
      ),
    ).toBe(true);
  });

  it("allows clearing dynamic mcp servers via setSessionConfigOption", async () => {
    const { sessionId } = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const query = sdkMockState.queryInstances[0]!;

    await agent.extMethod("setMcpServers", {
      sessionId,
      servers: {
        custom: {
          type: "stdio",
          command: "node",
          args: ["server.js"],
        },
      },
    });

    const response = await agent.setSessionConfigOption({
      sessionId,
      configId: "mcp_servers",
      value: "default",
    });

    expect(query.setMcpServers).toHaveBeenCalledWith({});
    expect(response.configOptions.find((option) => option.id === "mcp_servers")?.currentValue).toBe(
      "default",
    );

    await expect(
      agent.setSessionConfigOption({
        sessionId,
        configId: "mcp_servers",
        value: "custom",
      }),
    ).rejects.toMatchObject({ code: -32602 });
  });

  it("maps AskUserQuestion through ACP permission flow", async () => {
    const permissionRequests: unknown[] = [];
    agent = new ClaudeAcpAgent(
      createMockClient(async (request) => {
        permissionRequests.push(request);
        return {
          outcome: {
            outcome: "selected",
            optionId: "ask:0:1",
          },
        };
      }),
    );

    await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const canUseTool = sdkMockState.queryCalls[0]?.options?.canUseTool as
      | ((
          toolName: string,
          input: Record<string, unknown>,
          options: { signal: AbortSignal; toolUseID: string },
        ) => Promise<{
          behavior: "allow" | "deny";
          updatedInput?: Record<string, unknown>;
        }>)
      | undefined;
    expect(canUseTool).toBeDefined();

    const result = await canUseTool!(
      "AskUserQuestion",
      {
        questions: [
          {
            question: "Which strategy should we use?",
            header: "Strategy",
            options: [
              { label: "Broad", description: "Many shallow tests" },
              { label: "Deep", description: "Fewer detailed tests" },
            ],
            multiSelect: false,
          },
        ],
      },
      { signal: new AbortController().signal, toolUseID: "toolu_ask_1" },
    );

    expect(result.behavior).toBe("allow");
    expect(result.updatedInput?.answers).toEqual({
      "Which strategy should we use?": "Deep",
    });
    expect(permissionRequests).toHaveLength(1);
  });

  it("normalizes legacy explore subagent aliases before tool execution", async () => {
    agent = new ClaudeAcpAgent(
      createMockClient(async () => ({
        outcome: {
          outcome: "selected",
          optionId: "allow",
        },
      })),
    );

    await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const canUseTool = sdkMockState.queryCalls[0]?.options?.canUseTool as
      | ((
          toolName: string,
          input: Record<string, unknown>,
          options: { signal: AbortSignal; toolUseID: string },
        ) => Promise<{
          behavior: "allow" | "deny";
          updatedInput?: Record<string, unknown>;
        }>)
      | undefined;
    expect(canUseTool).toBeDefined();

    const result = await canUseTool!(
      "Agent",
      {
        subagent_type: "explore-high",
        prompt: "Inspect all auth files and summarize risks.",
      },
      { signal: new AbortController().signal, toolUseID: "toolu_agent_alias_1" },
    );

    expect(result.behavior).toBe("allow");
    expect(result.updatedInput?.subagent_type).toBe("Explore");
    expect(result.updatedInput?.prompt).toContain("Use high exploration thoroughness");
  });

  it("normalizes namespaced explore subagent aliases before tool execution", async () => {
    agent = new ClaudeAcpAgent(
      createMockClient(async () => ({
        outcome: {
          outcome: "selected",
          optionId: "allow",
        },
      })),
    );

    await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const canUseTool = sdkMockState.queryCalls[0]?.options?.canUseTool as
      | ((
          toolName: string,
          input: Record<string, unknown>,
          options: { signal: AbortSignal; toolUseID: string },
        ) => Promise<{
          behavior: "allow" | "deny";
          updatedInput?: Record<string, unknown>;
        }>)
      | undefined;
    expect(canUseTool).toBeDefined();

    const result = await canUseTool!(
      "Agent",
      {
        subagent_type: "oh-my-claudecode:explore-high",
        prompt: "Map all packages and report integration points.",
      },
      { signal: new AbortController().signal, toolUseID: "toolu_agent_alias_2" },
    );

    expect(result.behavior).toBe("allow");
    expect(result.updatedInput?.subagent_type).toBe("Explore");
    expect(result.updatedInput?.prompt).toContain("Use high exploration thoroughness");
  });

  it("handles /mcp locally when slash command is unavailable", async () => {
    const { sessionId } = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const query = sdkMockState.queryInstances[0]!;
    const response = await agent.prompt({
      sessionId,
      prompt: [{ type: "text", text: "/mcp" }],
    });

    expect(response.stopReason).toBe("end_turn");
    expect(query.mcpServerStatus).toHaveBeenCalledTimes(1);
    expect(query.next).not.toHaveBeenCalled();
    expect(
      sessionUpdates.some(
        (update) =>
          update.update.sessionUpdate === "agent_message_chunk" &&
          update.update.content.type === "text" &&
          update.update.content.text.includes("MCP server status:"),
      ),
    ).toBe(true);
  });

  it("emits visible completion updates for background task notifications", async () => {
    const { sessionId } = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const query = sdkMockState.queryInstances[0]!;
    const outputFilePath = path.join(tempDir, "task-bg-1.log");
    const noisyPrefix = Array.from({ length: 220 }, (_, index) => `line-${index + 1}`).join("\n");
    fs.writeFileSync(
      outputFilePath,
      `${noisyPrefix}\nFINAL SUMMARY: repository health looks good\n`,
      "utf8",
    );
    query.enqueue([
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_bg_1",
              name: "Task",
              input: {
                description: "Run background analysis",
                prompt: "Inspect repository health.",
                subagent_type: "general-purpose",
                run_in_background: true,
              },
            },
            {
              type: "tool_result",
              tool_use_id: "toolu_bg_1",
              content: `{"task_id":"task_bg_1","output_file":"${outputFilePath}"}`,
              is_error: false,
            },
          ],
        },
        parent_tool_use_id: null,
        uuid: "assistant-bg-uuid",
        session_id: sessionId,
      },
      {
        type: "system",
        subtype: "task_notification",
        task_id: "task_bg_1",
        status: "completed",
        output_file: outputFilePath,
        summary: "Background analysis finished.",
        uuid: "task-note-uuid",
        session_id: sessionId,
      },
      {
        type: "result",
        subtype: "success",
        result: "ok",
        is_error: false,
        duration_ms: 100,
        duration_api_ms: 80,
        num_turns: 1,
        stop_reason: "end_turn",
        total_cost_usd: 0.001,
        usage: {
          input_tokens: 3,
          output_tokens: 2,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
        modelUsage: {},
        permission_denials: [],
        uuid: "result-bg-uuid",
        session_id: sessionId,
      },
    ]);

    const promptResponse = await agent.prompt({
      sessionId,
      prompt: [{ type: "text", text: "Start background analysis." }],
    });

    expect(promptResponse.stopReason).toBe("end_turn");
    expect(
      sessionUpdates.some(
        (update) =>
          update.update.sessionUpdate === "tool_call_update" &&
          update.update.toolCallId === "toolu_bg_1" &&
          update.update.status === "in_progress",
      ),
    ).toBe(true);
    expect(
      sessionUpdates.some(
        (update) =>
          update.update.sessionUpdate === "tool_call_update" &&
          update.update.toolCallId === "toolu_bg_1" &&
          update.update.status === "completed",
      ),
    ).toBe(true);
    expect(
      sessionUpdates.some(
        (update) =>
          update.update.sessionUpdate === "agent_message_chunk" &&
          update.update.content.type === "text" &&
          update.update.content.text.includes("Background task task_bg_1 completed") &&
          update.update.content.text.includes("Background analysis finished.") &&
          update.update.content.text.includes(outputFilePath) &&
          update.update.content.text.includes("Output tail (last") &&
          update.update.content.text.includes("FINAL SUMMARY: repository health looks good"),
      ),
    ).toBe(true);
  });

  it("emits completion updates when TaskCompleted hook fires", async () => {
    const { sessionId } = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const query = sdkMockState.queryInstances[0]!;
    const queryOptions = sdkMockState.queryCalls[0]?.options ?? {};
    const taskCompletedMatchers = (
      (queryOptions as Record<string, unknown>).hooks as Record<string, unknown> | undefined
    )?.TaskCompleted as
      | Array<{ hooks?: Array<(input: unknown, toolUseId?: string, options?: unknown) => unknown> }>
      | undefined;
    const taskCompletedHook =
      taskCompletedMatchers?.[taskCompletedMatchers.length - 1]?.hooks?.[0] ?? null;
    expect(typeof taskCompletedHook).toBe("function");

    const outputFilePath = path.join(tempDir, "task-bg-hook.log");
    const noisyPrefix = Array.from({ length: 220 }, (_, index) => `line-${index + 1}`).join("\n");
    fs.writeFileSync(
      outputFilePath,
      `${noisyPrefix}\nFINAL SUMMARY: hook completion was delivered\n`,
      "utf8",
    );

    query.enqueue([
      {
        type: "assistant",
        message: {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_bg_hook",
              name: "Task",
              input: {
                description: "Run background analysis",
                prompt: "Inspect repository health.",
                subagent_type: "general-purpose",
                run_in_background: true,
              },
            },
            {
              type: "tool_result",
              tool_use_id: "toolu_bg_hook",
              content: `{"task_id":"task_bg_hook","output_file":"${outputFilePath}"}`,
              is_error: false,
            },
          ],
        },
        parent_tool_use_id: null,
        uuid: "assistant-bg-hook-uuid",
        session_id: sessionId,
      },
      {
        type: "result",
        subtype: "success",
        result: "ok",
        is_error: false,
        duration_ms: 100,
        duration_api_ms: 80,
        num_turns: 1,
        stop_reason: "end_turn",
        total_cost_usd: 0.001,
        usage: {
          input_tokens: 3,
          output_tokens: 2,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
        modelUsage: {},
        permission_denials: [],
        uuid: "result-bg-hook-uuid",
        session_id: sessionId,
      },
    ]);

    const promptResponse = await agent.prompt({
      sessionId,
      prompt: [{ type: "text", text: "Start background analysis." }],
    });
    expect(promptResponse.stopReason).toBe("end_turn");

    const updateCountBeforeHook = sessionUpdates.length;
    await taskCompletedHook?.(
      {
        hook_event_name: "TaskCompleted",
        session_id: sessionId,
        transcript_path: path.join(tempDir, "mock-transcript.jsonl"),
        cwd: tempDir,
        task_id: "task_bg_hook",
        task_subject: "Explore core package",
        task_description: "Inspect architecture and dependencies",
        teammate_name: "Explore",
        team_name: "analysis",
      },
      undefined,
      { signal: new AbortController().signal },
    );

    const updatesAfterHook = sessionUpdates.slice(updateCountBeforeHook);
    expect(
      updatesAfterHook.some(
        (update) =>
          update.update.sessionUpdate === "tool_call_update" &&
          update.update.toolCallId === "toolu_bg_hook" &&
          update.update.status === "completed",
      ),
    ).toBe(true);
    expect(
      updatesAfterHook.some(
        (update) =>
          update.update.sessionUpdate === "agent_message_chunk" &&
          update.update.content.type === "text" &&
          update.update.content.text.includes("Background task task_bg_hook completed") &&
          update.update.content.text.includes("Subject: Explore core package") &&
          update.update.content.text.includes("Details: Inspect architecture and dependencies") &&
          update.update.content.text.includes(outputFilePath) &&
          update.update.content.text.includes("Output tail (last") &&
          update.update.content.text.includes("FINAL SUMMARY: hook completion was delivered"),
      ),
    ).toBe(true);
  });

  it("supports explicit session teardown extension", async () => {
    const { sessionId } = await agent.newSession({
      cwd: tempDir,
      mcpServers: [],
      _meta: {
        disableBuiltInTools: true,
      },
    });

    const query = sdkMockState.queryInstances[0]!;
    await expect(agent.extMethod("closeSession", { sessionId })).resolves.toEqual({ closed: true });
    expect(query.close).toHaveBeenCalledTimes(1);
    await expect(agent.extMethod("closeSession", { sessionId })).resolves.toEqual({
      closed: false,
    });
  });
});
