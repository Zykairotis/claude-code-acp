import {
  Agent,
  AgentSideConnection,
  AuthenticateRequest,
  AvailableCommand,
  CancelNotification,
  ClientCapabilities,
  ForkSessionRequest,
  ForkSessionResponse,
  InitializeRequest,
  InitializeResponse,
  LoadSessionRequest,
  LoadSessionResponse,
  ListSessionsRequest,
  ListSessionsResponse,
  ndJsonStream,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  ReadTextFileRequest,
  ReadTextFileResponse,
  RequestError,
  ResumeSessionRequest,
  ResumeSessionResponse,
  SessionInfo,
  SessionModelState,
  SessionNotification,
  SetSessionModelRequest,
  SetSessionModelResponse,
  SetSessionConfigOptionRequest,
  SetSessionConfigOptionResponse,
  SetSessionModeRequest,
  SetSessionModeResponse,
  SessionConfigOption,
  SessionConfigSelectGroup,
  SessionConfigSelectOption,
  TerminalHandle,
  TerminalOutputResponse,
  WriteTextFileRequest,
  WriteTextFileResponse,
} from "@agentclientprotocol/sdk";
import { SettingsManager } from "./settings.js";
import {
  CanUseTool,
  McpServerConfig,
  ModelInfo,
  Options,
  PermissionResult,
  PermissionMode,
  Query,
  query,
  SDKPartialAssistantMessage,
  SDKResultMessage,
  SDKUserMessage,
  SlashCommand,
} from "@anthropic-ai/claude-agent-sdk";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import * as os from "node:os";
import {
  encodeProjectPath,
  nodeToWebReadable,
  nodeToWebWritable,
  Pushable,
  unreachable,
} from "./utils.js";
import { createMcpServer } from "./mcp-server.js";
import { EDIT_TOOL_NAMES, acpToolNames } from "./tools.js";
import {
  toolInfoFromToolUse,
  planEntries,
  toolUpdateFromToolResult,
  ClaudePlanEntry,
  registerHookCallback,
  createPostToolUseHook,
  createPreToolUseHook,
} from "./tools.js";
import { ContentBlockParam } from "@anthropic-ai/sdk/resources";
import { BetaContentBlock, BetaRawContentBlockDelta } from "@anthropic-ai/sdk/resources/beta.mjs";
import packageJson from "../package.json" with { type: "json" };
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

export const CLAUDE_CONFIG_DIR =
  process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
const AUTH_METHOD_ID = "claude-login";

/**
 * Decode a Claude project path encoding back to the original filesystem path.
 * Claude encodes paths by replacing path separators with dashes:
 * - Unix: "/Users/morse/project" -> "-Users-morse-project"
 * - Windows: "C:\Users\morse\project" -> "C-Users-morse-project"
 */
function decodeProjectPath(encodedPath: string): string {
  // Check if this looks like a Windows path (starts with drive letter pattern like "C-")
  const windowsDriveMatch = encodedPath.match(/^([A-Za-z])-/);
  if (windowsDriveMatch) {
    // Windows path: "C-Users-morse-project" -> "C:\Users\morse\project"
    const driveLetter = windowsDriveMatch[1];
    const rest = encodedPath.slice(2); // Skip "C-"
    return `${driveLetter}:\\${rest.replace(/-/g, "\\")}`;
  }

  // Unix path: "-Users-morse-project" -> "/Users/morse/project"
  return encodedPath.replace(/-/g, "/");
}

function sessionFilePath(cwd: string, sessionId: string): string {
  return path.join(CLAUDE_CONFIG_DIR, "projects", encodeProjectPath(cwd), `${sessionId}.jsonl`);
}

async function loadUserMessageCheckpoints(cwd: string, sessionId: string): Promise<string[]> {
  const checkpoints: string[] = [];
  const seen = new Set<string>();

  try {
    const content = await fs.promises.readFile(sessionFilePath(cwd, sessionId), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      try {
        const entry = JSON.parse(trimmed) as {
          type?: string;
          uuid?: string;
          parent_tool_use_id?: string | null;
        };

        if (
          entry.type === "user" &&
          typeof entry.uuid === "string" &&
          entry.uuid.length > 0 &&
          (entry.parent_tool_use_id === null || entry.parent_tool_use_id === undefined) &&
          !seen.has(entry.uuid)
        ) {
          seen.add(entry.uuid);
          checkpoints.push(entry.uuid);
        }
      } catch {
        // Ignore malformed rows.
      }
    }
  } catch {
    // Ignore missing or unreadable transcripts.
  }

  return checkpoints;
}

const MAX_TITLE_LENGTH = 128;

function sanitizeTitle(text: string): string {
  // Replace newlines and collapse whitespace
  const sanitized = text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (sanitized.length <= MAX_TITLE_LENGTH) {
    return sanitized;
  }
  return sanitized.slice(0, MAX_TITLE_LENGTH - 1) + "…";
}

/**
 * Logger interface for customizing logging output
 */
export interface Logger {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

type Session = {
  query: Query;
  input: Pushable<SDKUserMessage>;
  cancelled: boolean;
  permissionMode: PermissionMode;
  sessionConfig: SessionConfigState;
  settingsManager: SettingsManager;
  userMessageCheckpoints: string[];
  lastAvailableCommands: AvailableCommand[];
  // Multi-query support for context clearing
  queryHistory: Query[];           // Track all queries for proper cleanup
  sdkSessionId: string | null;     // SDK session ID for resume operations
  contextCleared: boolean;         // Flag indicating context was cleared
};

type ThoughtLevelId = "adaptive" | "low" | "medium" | "high";
type RewindPolicyId = "acp_wrapper" | "native" | "both";
type ToggleValueId = "enabled" | "disabled";
type CustomStateValueId = "default" | "custom";
type ToolsConfigValueId = "preset_claude_code" | "none" | "custom";
type MaxValueId = "unlimited" | string;

type SessionConfigState = {
  modeId: PermissionMode;
  availableModeIds: PermissionMode[];
  modelId: string;
  modelOptions: SessionConfigSelectOption[];
  thoughtLevelId: ThoughtLevelId;
  maxThinkingTokens: number | null;
  outputStyleId: string;
  outputStyleOptions: SessionConfigSelectOption[];
  rewindPolicyId: RewindPolicyId;
  additionalDirectoriesValueId: CustomStateValueId;
  allowedToolsValueId: CustomStateValueId;
  disallowedToolsValueId: CustomStateValueId;
  toolsValueId: ToolsConfigValueId;
  envValueId: CustomStateValueId;
  enableFileCheckpointingValueId: ToggleValueId;
  persistSessionValueId: ToggleValueId;
  maxTurnsValue: number | null;
  maxBudgetUsdValue: number | null;
  mcpServersValueId: CustomStateValueId;
  sandboxValueId: ToggleValueId;
  accountInfo: unknown | null;
  enablePartialMessagesValueId: ToggleValueId;
  betasValueId: CustomStateValueId;
  systemPromptValueId: CustomStateValueId;
  outputFormatValueId: CustomStateValueId;
  agentsValueId: CustomStateValueId;
  settingSourcesValueId: CustomStateValueId;
  fallbackModelValueId: CustomStateValueId;
  userValueId: CustomStateValueId;
  cliPathValueId: CustomStateValueId;
};

type SessionHistoryEntry = {
  type?: string;
  isSidechain?: boolean;
  sessionId?: string;
  parent_tool_use_id?: string | null;
  message?: {
    role?: string;
    content?: unknown;
    model?: string;
  };
};

type BackgroundTerminal =
  | {
      handle: TerminalHandle;
      status: "started";
      lastOutput: TerminalOutputResponse | null;
    }
  | {
      status: "aborted" | "exited" | "killed" | "timedOut";
      pendingOutput: TerminalOutputResponse;
    };

type BackgroundTaskToolCall = {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  outputFile?: string;
};

/**
 * Extra metadata that can be given to Claude Code when creating a new session.
 */
export type NewSessionMeta = {
  claudeCode?: {
    /**
     * Optional startup session config values surfaced as ACP selectors.
     * `mode` and `model` take effect at startup.
     * `thoughtLevel` takes effect at startup and maps to `Query.setMaxThinkingTokens`.
     * `outputStyle` sets ACP-local selector state.
     */
    sessionConfig?: {
      mode?: PermissionMode;
      model?: string;
      thoughtLevel?: ThoughtLevelId;
      outputStyle?: string;
      rewindPolicy?: RewindPolicyId;
      additionalDirectories?: string[];
      allowedTools?: string[];
      disallowedTools?: string[];
      tools?: Options["tools"];
      env?: Record<string, string | undefined>;
      enableFileCheckpointing?: boolean;
      persistSession?: boolean;
      maxThinkingTokens?: number;
      maxTurns?: number;
      maxBudgetUsd?: number;
      mcpServers?: Record<string, McpServerConfig>;
      sandbox?: Options["sandbox"];
      enablePartialMessages?: boolean;
      betas?: string[];
      systemPrompt?: Options["systemPrompt"];
      outputFormat?: Options["outputFormat"];
      agents?: Options["agents"];
      settingSources?: Options["settingSources"];
      fallbackModel?: string;
      user?: string;
      cliPath?: string;
    };

    /**
     * Options forwarded to Claude Code when starting a new session.
     * Those parameters will be ignored and managed by ACP:
     *   - cwd
     *   - includePartialMessages
     *   - allowDangerouslySkipPermissions
     *   - permissionMode
     *   - canUseTool
     *   - executable
     * Those parameters will be used and updated to work with ACP:
     *   - hooks (merged with ACP's hooks)
     *   - mcpServers (merged with ACP's mcpServers)
     */
    options?: Options;
  };
};

/**
 * Extra metadata that the agent provides for each tool_call / tool_update update.
 */
export type ToolUpdateMeta = {
  claudeCode?: {
    /* The name of the tool that was used in Claude Code. */
    toolName: string;
    /* The structured output provided by Claude Code. */
    toolResponse?: unknown;
    /* Parent tool_use id when this tool call is running inside another tool context. */
    parentToolUseId?: string | null;
    /* Subagent type for nested tool calls when available. */
    subagentType?: string;
    /* Human-readable subagent label that includes subagent type + parent tool id. */
    subagentLabel?: string;
    /* Background task id emitted for Task/Agent run_in_background tools. */
    backgroundTaskId?: string;
    /* Output file path for background tasks, when available. */
    backgroundOutputFile?: string;
    /* Background task status. */
    taskStatus?: "completed" | "failed" | "stopped";
  };
};

export type ToolUseCache = {
  [key: string]: {
    type: "tool_use" | "server_tool_use" | "mcp_tool_use";
    id: string;
    name: string;
    input: unknown;
  };
};

// Bypass Permissions doesn't work if we are a root/sudo user
const IS_ROOT = (process.geteuid?.() ?? process.getuid?.()) === 0;
const ALLOW_BYPASS = !IS_ROOT || !!process.env.IS_SANDBOX;

const SESSION_CONFIG_IDS = {
  mode: "mode",
  model: "model",
  thoughtLevel: "thought_level",
  maxThinkingTokens: "max_thinking_tokens",
  outputStyle: "output_style",
  rewindPolicy: "rewind_policy",
  additionalDirectories: "additional_directories",
  allowedTools: "allowed_tools",
  disallowedTools: "disallowed_tools",
  tools: "tools",
  env: "env",
  enableFileCheckpointing: "enable_file_checkpointing",
  persistSession: "persist_session",
  maxTurns: "max_turns",
  maxBudgetUsd: "max_budget_usd",
  mcpServers: "mcp_servers",
  sandbox: "sandbox",
  enablePartialMessages: "enable_partial_messages",
  betas: "betas",
  systemPrompt: "system_prompt",
  outputFormat: "output_format",
  agents: "agents",
  settingSources: "setting_sources",
  fallbackModel: "fallback_model",
  user: "user",
  cliPath: "cli_path",
} as const;

const EXTENSION_METHODS = {
  closeSession: "zed.dev/claude-code-acp/session_close",
  mcpServerStatus: "zed.dev/claude-code-acp/mcp_server_status",
  reconnectMcpServer: "zed.dev/claude-code-acp/mcp_reconnect",
  toggleMcpServer: "zed.dev/claude-code-acp/mcp_toggle",
  setMcpServers: "zed.dev/claude-code-acp/mcp_set_servers",
  refreshSessionInfo: "zed.dev/claude-code-acp/session_info_refresh",
  streamInput: "zed.dev/claude-code-acp/stream_input",
} as const;

const THOUGHT_LEVEL_TOKEN_LIMITS: Record<ThoughtLevelId, number | null> = {
  adaptive: null,
  low: 1024,
  medium: 4096,
  high: 8192,
};

const TOGGLE_OPTIONS: SessionConfigSelectOption[] = [
  { value: "enabled", name: "Enabled" },
  { value: "disabled", name: "Disabled" },
];

const CUSTOM_STATE_OPTIONS: SessionConfigSelectOption[] = [
  { value: "default", name: "Default" },
  { value: "custom", name: "Custom" },
];

const TOOLS_OPTIONS: SessionConfigSelectOption[] = [
  { value: "preset_claude_code", name: "Claude Code Preset" },
  { value: "none", name: "No Built-in Tools" },
  { value: "custom", name: "Custom Tool Set" },
];

const REWIND_POLICY_OPTIONS: SessionConfigSelectOption[] = [
  {
    value: "acp_wrapper",
    name: "ACP Wrapper",
    description: "Prefer mcp__acp__RewindFiles and disallow native RewindFiles.",
  },
  {
    value: "native",
    name: "Native Tool",
    description: "Allow native RewindFiles and disallow ACP wrapper tool.",
  },
  {
    value: "both",
    name: "Allow Both",
    description: "Allow both native and ACP rewind tools.",
  },
];

const THOUGHT_LEVEL_OPTION_GROUPS: SessionConfigSelectGroup[] = [
  {
    group: "balanced",
    name: "Balanced",
    options: [
      {
        value: "adaptive",
        name: "Adaptive",
        description: "Use SDK defaults for balanced reasoning depth.",
      },
      {
        value: "low",
        name: "Low",
        description: "Faster responses with lighter reasoning.",
      },
      {
        value: "medium",
        name: "Medium",
        description: "Balanced depth and response speed.",
      },
    ],
  },
  {
    group: "deep",
    name: "Deep Reasoning",
    options: [
      {
        value: "high",
        name: "High",
        description: "More reasoning tokens for harder tasks.",
      },
    ],
  },
];

function inferThoughtLevelId(maxThinkingTokens: number | null | undefined): ThoughtLevelId {
  if (maxThinkingTokens === undefined || maxThinkingTokens === null) {
    return "adaptive";
  }
  if (maxThinkingTokens <= 1024) {
    return "low";
  }
  if (maxThinkingTokens <= 4096) {
    return "medium";
  }
  return "high";
}

function toMaxValueId(value: number | null | undefined): MaxValueId {
  if (value === null || value === undefined) {
    return "unlimited";
  }
  return String(value);
}

function parseMaxValueId(value: string): number | null {
  if (value === "unlimited") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return NaN;
  }
  return parsed;
}

function maxValueOptions(
  baseValues: number[],
  currentValue: number | null,
  labels?: Partial<Record<string, string>>,
): SessionConfigSelectOption[] {
  const emitted = new Set<string>();
  const options: SessionConfigSelectOption[] = [];

  const pushOption = (valueId: string, name: string) => {
    if (emitted.has(valueId)) {
      return;
    }
    emitted.add(valueId);
    options.push({ value: valueId, name });
  };

  pushOption("unlimited", labels?.unlimited ?? "Unlimited");
  for (const value of baseValues) {
    const valueId = String(value);
    pushOption(valueId, labels?.[valueId] ?? valueId);
  }

  if (currentValue !== null) {
    const currentValueId = String(currentValue);
    if (!emitted.has(currentValueId)) {
      pushOption(currentValueId, `${currentValueId} (custom)`);
    }
  }

  return options;
}

function toToolsConfigValueId(tools: Options["tools"] | undefined): ToolsConfigValueId {
  if (!tools) {
    return "preset_claude_code";
  }
  if (Array.isArray(tools) && tools.length === 0) {
    return "none";
  }
  if (typeof tools === "object" && "type" in tools && tools.type === "preset") {
    return tools.preset === "claude_code" ? "preset_claude_code" : "custom";
  }
  return "custom";
}

function availablePermissionModes(): PermissionMode[] {
  const modes: PermissionMode[] = ["default", "acceptEdits", "plan", "delegate", "dontAsk"];
  if (ALLOW_BYPASS) {
    modes.push("bypassPermissions");
  }
  return modes;
}

function buildAvailableModes() {
  const modes: Array<{ id: PermissionMode; name: string; description: string }> = [
    {
      id: "default" as const,
      name: "Default",
      description: "Standard behavior, prompts for dangerous operations",
    },
    {
      id: "acceptEdits" as const,
      name: "Accept Edits",
      description: "Auto-accept file edit operations",
    },
    {
      id: "plan" as const,
      name: "Plan Mode",
      description: "Planning mode, no actual tool execution",
    },
    {
      id: "delegate" as const,
      name: "Delegate Mode",
      description: "Delegate execution to subagents and task tools",
    },
    {
      id: "dontAsk" as const,
      name: "Don't Ask",
      description: "Don't prompt for permissions, deny if not pre-approved",
    },
  ];
  if (ALLOW_BYPASS) {
    modes.push({
      id: "bypassPermissions" as const,
      name: "Bypass Permissions",
      description: "Bypass all permission checks",
    });
  }
  return modes;
}

function isPermissionMode(value: string): value is PermissionMode {
  return (
    value === "default" ||
    value === "acceptEdits" ||
    value === "bypassPermissions" ||
    value === "plan" ||
    value === "delegate" ||
    value === "dontAsk"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapSdkUsageToAcpUsage(usage: unknown): PromptResponse["usage"] | undefined {
  if (!isRecord(usage)) {
    return undefined;
  }

  const inputTokens = toFiniteNumber(usage.input_tokens);
  const outputTokens = toFiniteNumber(usage.output_tokens);
  const cachedReadTokens = toFiniteNumber(usage.cache_read_input_tokens);
  const cachedWriteTokens = toFiniteNumber(usage.cache_creation_input_tokens);

  let thoughtTokens =
    toFiniteNumber(usage.thinking_tokens) ?? toFiniteNumber(usage.reasoning_tokens);
  if (thoughtTokens === null && isRecord(usage.output_tokens_details)) {
    thoughtTokens = toFiniteNumber(usage.output_tokens_details.reasoning_tokens);
  }

  const hasAnyValue =
    inputTokens !== null ||
    outputTokens !== null ||
    cachedReadTokens !== null ||
    cachedWriteTokens !== null ||
    thoughtTokens !== null;
  if (!hasAnyValue) {
    return undefined;
  }

  const normalizedInputTokens = inputTokens ?? 0;
  const normalizedOutputTokens = outputTokens ?? 0;
  const normalizedCachedReadTokens = cachedReadTokens ?? 0;
  const normalizedCachedWriteTokens = cachedWriteTokens ?? 0;
  const normalizedThoughtTokens = thoughtTokens ?? 0;

  const acpUsage: NonNullable<PromptResponse["usage"]> = {
    inputTokens: normalizedInputTokens,
    outputTokens: normalizedOutputTokens,
    totalTokens:
      normalizedInputTokens +
      normalizedOutputTokens +
      normalizedCachedReadTokens +
      normalizedCachedWriteTokens +
      normalizedThoughtTokens,
  };

  if (cachedReadTokens !== null) {
    acpUsage.cachedReadTokens = cachedReadTokens;
  }
  if (cachedWriteTokens !== null) {
    acpUsage.cachedWriteTokens = cachedWriteTokens;
  }
  if (thoughtTokens !== null) {
    acpUsage.thoughtTokens = thoughtTokens;
  }

  return acpUsage;
}

function estimateContextWindowFromModelUsage(modelUsage: unknown): number | null {
  if (!isRecord(modelUsage)) {
    return null;
  }

  let maxContextWindow = 0;
  for (const usage of Object.values(modelUsage)) {
    if (!isRecord(usage)) {
      continue;
    }
    const contextWindow = toFiniteNumber(usage.contextWindow);
    if (contextWindow !== null && contextWindow > maxContextWindow) {
      maxContextWindow = contextWindow;
    }
  }

  return maxContextWindow > 0 ? maxContextWindow : null;
}

function buildResultMeta(message: SDKResultMessage): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    subtype: message.subtype,
    durationMs: message.duration_ms,
    durationApiMs: message.duration_api_ms,
    numTurns: message.num_turns,
    stopReason: message.stop_reason,
    totalCostUsd: message.total_cost_usd,
    modelUsage: message.modelUsage,
    permissionDenials: message.permission_denials,
  };

  if (message.subtype === "success" && message.structured_output !== undefined) {
    meta.structuredOutput = message.structured_output;
  }

  if (message.subtype !== "success" && message.errors.length > 0) {
    meta.errors = message.errors;
  }

  return meta;
}

function availableCommandsEqual(a: AvailableCommand[], b: AvailableCommand[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i].name !== b[i].name || a[i].description !== b[i].description) {
      return false;
    }

    const aHint = a[i].input?.hint ?? null;
    const bHint = b[i].input?.hint ?? null;
    if (aHint !== bHint) {
      return false;
    }
  }

  return true;
}

function normalizeCommandName(name: string): string {
  return name.trim().replace(/^\//, "").toLowerCase();
}

function normalizeToolInputForCompatibility(
  toolName: string,
  toolInput: Record<string, unknown>,
): Record<string, unknown> {
  if (toolName !== "Agent" && toolName !== "Task") {
    return toolInput;
  }

  const currentType = toolInput.subagent_type;
  if (typeof currentType !== "string" || currentType.trim().length === 0) {
    return toolInput;
  }

  const normalizedType = currentType.trim().toLowerCase();
  const typeSegments = normalizedType.split(":").filter(Boolean);
  const normalizedTypeWithoutNamespace =
    typeSegments.length > 1 ? typeSegments[typeSegments.length - 1] : normalizedType;
  let mappedType: string | null = null;
  let exploreThoroughness: "quick" | "medium" | "high" | null = null;

  switch (normalizedTypeWithoutNamespace) {
    case "explore":
      mappedType = "Explore";
      break;
    case "explore-low":
    case "explore-quick":
    case "explore-fast":
      mappedType = "Explore";
      exploreThoroughness = "quick";
      break;
    case "explore-medium":
      mappedType = "Explore";
      exploreThoroughness = "medium";
      break;
    case "explore-high":
    case "explore-thorough":
    case "explore-very-thorough":
    case "explore-very-high":
      mappedType = "Explore";
      exploreThoroughness = "high";
      break;
    case "plan":
      mappedType = "Plan";
      break;
    case "general-purpose":
    case "general_purpose":
    case "generalpurpose":
      mappedType = "general-purpose";
      break;
    default:
      return toolInput;
  }

  const updatedInput: Record<string, unknown> = {
    ...toolInput,
    subagent_type: mappedType,
  };

  if (exploreThoroughness) {
    const existingPrompt = typeof toolInput.prompt === "string" ? toolInput.prompt : "";
    const preface = `Use ${exploreThoroughness} exploration thoroughness for this task.`;
    const hasExistingPreface =
      typeof toolInput.prompt === "string" &&
      toolInput.prompt.toLowerCase().includes("exploration thoroughness");
    if (!hasExistingPreface) {
      updatedInput.prompt = existingPrompt ? `${preface}\n\n${existingPrompt}` : preface;
    }
  }

  return updatedInput;
}

type SubagentToolContext = {
  parentToolUseId: string;
  subagentType?: string;
  label: string;
};

function isSubagentLauncherToolName(name: string): boolean {
  return (
    name === "Task" || name === "Agent" || name === acpToolNames.task || name === acpToolNames.agent
  );
}

function resolveSubagentToolContext(
  parentToolUseId: string | null | undefined,
  toolUseCache: ToolUseCache,
): SubagentToolContext | null {
  if (!parentToolUseId) {
    return null;
  }

  const parentToolUse = toolUseCache[parentToolUseId];
  if (!parentToolUse) {
    return {
      parentToolUseId,
      label: `subagent#${parentToolUseId}`,
    };
  }

  if (!isSubagentLauncherToolName(parentToolUse.name)) {
    return null;
  }

  let subagentType: string | undefined;
  if (isRecord(parentToolUse.input)) {
    const parentSubagentType = parentToolUse.input.subagent_type;
    if (typeof parentSubagentType === "string" && parentSubagentType.trim().length > 0) {
      subagentType = parentSubagentType.trim();
    }
  }

  const label = `${subagentType ?? "subagent"}#${parentToolUseId}`;
  return {
    parentToolUseId,
    subagentType,
    label,
  };
}

function prefixTitleWithSubagentContext(
  title: string | undefined,
  context: SubagentToolContext | null,
): string | undefined {
  if (!context) {
    return title;
  }
  if (!title || title.length === 0) {
    return `[${context.label}]`;
  }
  return `[${context.label}] ${title}`;
}

// Implement the ACP Agent interface
export class ClaudeAcpAgent implements Agent {
  sessions: {
    [key: string]: Session;
  };
  client: AgentSideConnection;
  toolUseCache: ToolUseCache;
  backgroundTaskToolCalls: { [taskId: string]: BackgroundTaskToolCall } = {};
  backgroundTaskToolCallsByOutputFile: { [outputFile: string]: BackgroundTaskToolCall } = {};
  completedBackgroundTaskIds: string[] = [];
  backgroundTerminals: { [key: string]: BackgroundTerminal } = {};
  clientCapabilities?: ClientCapabilities;
  logger: Logger;

  constructor(client: AgentSideConnection, logger?: Logger) {
    this.sessions = {};
    this.client = client;
    this.toolUseCache = {};
    this.logger = logger ?? console;
  }

  private getSessionOrThrow(sessionId: string): Session {
    const session = this.sessions[sessionId];
    if (!session) {
      throw new Error("Session not found");
    }
    return session;
  }

  private backgroundTaskKey(sessionId: string, taskId: string): string {
    return `${sessionId}:${taskId}`;
  }

  private hasCompletedBackgroundTask(sessionId: string, taskId: string): boolean {
    return this.completedBackgroundTaskIds.includes(this.backgroundTaskKey(sessionId, taskId));
  }

  private rememberCompletedBackgroundTask(sessionId: string, taskId: string): void {
    const key = this.backgroundTaskKey(sessionId, taskId);
    if (this.completedBackgroundTaskIds.includes(key)) {
      return;
    }
    this.completedBackgroundTaskIds.push(key);
    // Keep bounded memory for long-lived sessions.
    if (this.completedBackgroundTaskIds.length > 5000) {
      this.completedBackgroundTaskIds.shift();
    }
  }

  private async readOutputFileTail(
    outputFile: string,
    maxBytes: number = 8 * 1024,
    maxLines: number = 80,
  ): Promise<string | null> {
    try {
      const stat = await fs.promises.stat(outputFile);
      if (!stat.isFile()) {
        return null;
      }
      const length = Math.max(0, Math.min(maxBytes, stat.size));
      if (length === 0) {
        return null;
      }

      const fd = await fs.promises.open(outputFile, "r");
      try {
        const buffer = Buffer.alloc(length);
        const start = Math.max(0, stat.size - length);
        await fd.read(buffer, 0, length, start);
        const text = buffer.toString("utf-8");
        const lines = text.split(/\r?\n/);
        const tailLines = lines.slice(-maxLines);
        return tailLines.join("\n").trim() || null;
      } finally {
        await fd.close();
      }
    } catch {
      return null;
    }
  }

  private groupedModelOptions(
    options: SessionConfigSelectOption[],
  ): SessionConfigSelectOption[] | SessionConfigSelectGroup[] {
    if (options.length === 0) {
      return [];
    }

    const groups = new Map<string, SessionConfigSelectOption[]>();
    for (const option of options) {
      const groupId =
        option.value === "default"
          ? "recommended"
          : option.value.startsWith("claude-")
            ? "claude"
            : option.value.split("-")[0] || "other";
      const existing = groups.get(groupId);
      if (existing) {
        existing.push(option);
      } else {
        groups.set(groupId, [option]);
      }
    }

    if (groups.size <= 1) {
      return [
        {
          group: "all_models",
          name: "Available Models",
          options,
        },
      ];
    }

    const orderedIds = ["recommended", "claude", ...Array.from(groups.keys()).sort()];
    const emitted = new Set<string>();
    const grouped: SessionConfigSelectGroup[] = [];

    for (const groupId of orderedIds) {
      if (emitted.has(groupId)) {
        continue;
      }
      const groupOptions = groups.get(groupId);
      if (!groupOptions) {
        continue;
      }
      emitted.add(groupId);
      grouped.push({
        group: groupId,
        name:
          groupId === "recommended"
            ? "Recommended"
            : groupId === "claude"
              ? "Claude"
              : groupId.charAt(0).toUpperCase() + groupId.slice(1),
        options: groupOptions,
      });
    }

    return grouped;
  }

  private getSessionConfigOptions(session: Session): SessionConfigOption[] {
    return [
      {
        id: SESSION_CONFIG_IDS.model,
        type: "select",
        name: "Model",
        category: "model",
        description: "Active model used for this session.",
        currentValue: session.sessionConfig.modelId,
        options: this.groupedModelOptions(session.sessionConfig.modelOptions),
      },
      {
        id: SESSION_CONFIG_IDS.mode,
        type: "select",
        name: "Mode",
        category: "mode",
        description: "Permission and execution mode for this session.",
        currentValue: session.sessionConfig.modeId,
        options: session.sessionConfig.availableModeIds.map((modeId) => ({
          value: modeId,
          name: modeId,
        })),
      },
      {
        id: SESSION_CONFIG_IDS.thoughtLevel,
        type: "select",
        name: "Thought Level",
        category: "thought_level",
        description: "Reasoning depth and token budget for responses.",
        currentValue: session.sessionConfig.thoughtLevelId,
        options: THOUGHT_LEVEL_OPTION_GROUPS,
      },
      {
        id: SESSION_CONFIG_IDS.maxThinkingTokens,
        type: "select",
        name: "Max Thinking Tokens",
        category: "_claude_max_thinking_tokens",
        description: "Maximum reasoning tokens for this session. Runtime mutable.",
        currentValue: toMaxValueId(session.sessionConfig.maxThinkingTokens),
        options: maxValueOptions([1024, 4096, 8192], session.sessionConfig.maxThinkingTokens, {
          unlimited: "Adaptive (SDK default)",
        }),
      },
      {
        id: SESSION_CONFIG_IDS.outputStyle,
        type: "select",
        name: "Output Style",
        category: "_claude_output_style",
        description: "Claude Code output style profile.",
        currentValue: session.sessionConfig.outputStyleId,
        options: session.sessionConfig.outputStyleOptions,
      },
      {
        id: SESSION_CONFIG_IDS.rewindPolicy,
        type: "select",
        name: "Rewind Tool Policy",
        category: "_claude_rewind_policy",
        description: "Choose native RewindFiles or ACP wrapper preference. Creation-time only.",
        currentValue: session.sessionConfig.rewindPolicyId,
        options: REWIND_POLICY_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.additionalDirectories,
        type: "select",
        name: "Additional Directories",
        category: "_claude_additional_directories",
        description: "Whether extra filesystem directories are configured. Creation-time only.",
        currentValue: session.sessionConfig.additionalDirectoriesValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.allowedTools,
        type: "select",
        name: "Allowed Tools",
        category: "_claude_allowed_tools",
        description: "Whether explicit allowed tool list is configured. Creation-time only.",
        currentValue: session.sessionConfig.allowedToolsValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.disallowedTools,
        type: "select",
        name: "Disallowed Tools",
        category: "_claude_disallowed_tools",
        description: "Whether explicit disallowed tool list is configured. Creation-time only.",
        currentValue: session.sessionConfig.disallowedToolsValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.tools,
        type: "select",
        name: "Tool Set",
        category: "_claude_tools",
        description: "Base built-in tool set configuration. Creation-time only.",
        currentValue: session.sessionConfig.toolsValueId,
        options: TOOLS_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.env,
        type: "select",
        name: "Environment Variables",
        category: "_claude_env",
        description: "Whether custom environment variables are configured. Creation-time only.",
        currentValue: session.sessionConfig.envValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.enableFileCheckpointing,
        type: "select",
        name: "File Checkpointing",
        category: "_claude_enable_file_checkpointing",
        description: "Tracks file history for rewind operations. Creation-time only.",
        currentValue: session.sessionConfig.enableFileCheckpointingValueId,
        options: TOGGLE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.persistSession,
        type: "select",
        name: "Persist Session",
        category: "_claude_persist_session",
        description: "Persist conversation transcript to disk. Creation-time only.",
        currentValue: session.sessionConfig.persistSessionValueId,
        options: TOGGLE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.maxTurns,
        type: "select",
        name: "Max Turns",
        category: "_claude_max_turns",
        description: "Maximum turns before query stops. Creation-time only.",
        currentValue: toMaxValueId(session.sessionConfig.maxTurnsValue),
        options: maxValueOptions([10, 25, 50, 100], session.sessionConfig.maxTurnsValue),
      },
      {
        id: SESSION_CONFIG_IDS.maxBudgetUsd,
        type: "select",
        name: "Max Budget (USD)",
        category: "_claude_max_budget_usd",
        description: "Maximum budget before query stops. Creation-time only.",
        currentValue: toMaxValueId(session.sessionConfig.maxBudgetUsdValue),
        options: maxValueOptions([1, 5, 10, 20], session.sessionConfig.maxBudgetUsdValue),
      },
      {
        id: SESSION_CONFIG_IDS.mcpServers,
        type: "select",
        name: "MCP Servers",
        category: "_claude_mcp_servers",
        description:
          "Dynamic MCP server state. Runtime mutable: select default to clear dynamic servers; use mcp_set_servers to define custom servers.",
        currentValue: session.sessionConfig.mcpServersValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.sandbox,
        type: "select",
        name: "Sandbox",
        category: "_claude_sandbox",
        description: "Sandbox command execution behavior. Creation-time only.",
        currentValue: session.sessionConfig.sandboxValueId,
        options: TOGGLE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.enablePartialMessages,
        type: "select",
        name: "Streaming Partial Messages",
        category: "_claude_enable_partial_messages",
        description: "Enable real-time streaming of partial messages. Runtime mutable.",
        currentValue: session.sessionConfig.enablePartialMessagesValueId,
        options: TOGGLE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.betas,
        type: "select",
        name: "Beta Features",
        category: "_claude_betas",
        description: "Enable experimental SDK beta features. Creation-time only.",
        currentValue: session.sessionConfig.betasValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.systemPrompt,
        type: "select",
        name: "System Prompt",
        category: "_claude_system_prompt",
        description: "Custom system prompt configuration. Creation-time only.",
        currentValue: session.sessionConfig.systemPromptValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.outputFormat,
        type: "select",
        name: "Structured Output",
        category: "_claude_output_format",
        description: "JSON Schema output format configuration. Creation-time only.",
        currentValue: session.sessionConfig.outputFormatValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.agents,
        type: "select",
        name: "Subagent Definitions",
        category: "_claude_agents",
        description: "Programmatic subagent definitions. Creation-time only.",
        currentValue: session.sessionConfig.agentsValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.settingSources,
        type: "select",
        name: "Setting Sources",
        category: "_claude_setting_sources",
        description: "Filesystem setting sources (enables Skills). Creation-time only.",
        currentValue: session.sessionConfig.settingSourcesValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.fallbackModel,
        type: "select",
        name: "Fallback Model",
        category: "_claude_fallback_model",
        description: "Automatic failover model when primary fails. Creation-time only.",
        currentValue: session.sessionConfig.fallbackModelValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.user,
        type: "select",
        name: "User Identifier",
        category: "_claude_user",
        description: "User identifier for analytics and tracking. Creation-time only.",
        currentValue: session.sessionConfig.userValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
      {
        id: SESSION_CONFIG_IDS.cliPath,
        type: "select",
        name: "CLI Path",
        category: "_claude_cli_path",
        description: "Custom path to Claude Code CLI executable. Creation-time only.",
        currentValue: session.sessionConfig.cliPathValueId,
        options: CUSTOM_STATE_OPTIONS,
      },
    ];
  }

  private async emitConfigOptionUpdate(sessionId: string): Promise<void> {
    const session = this.getSessionOrThrow(sessionId);
    await this.sendSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "config_option_update",
        configOptions: this.getSessionConfigOptions(session),
      },
    });
  }

  private updateSessionModeState(session: Session, modeId: PermissionMode): boolean {
    const changed = session.sessionConfig.modeId !== modeId;
    session.permissionMode = modeId;
    session.sessionConfig.modeId = modeId;
    return changed;
  }

  private updateSessionModelState(session: Session, modelId: string): boolean {
    const changed = session.sessionConfig.modelId !== modelId;
    session.sessionConfig.modelId = modelId;
    return changed;
  }

  private updateSessionOutputStyleState(session: Session, outputStyleId: string): boolean {
    const changed = session.sessionConfig.outputStyleId !== outputStyleId;
    session.sessionConfig.outputStyleId = outputStyleId;
    return changed;
  }

  private updateSessionMaxThinkingTokensState(
    session: Session,
    maxThinkingTokens: number | null,
  ): boolean {
    const currentMaxThinkingTokens = session.sessionConfig.maxThinkingTokens;
    const currentThoughtLevelId = session.sessionConfig.thoughtLevelId;
    const nextThoughtLevelId = inferThoughtLevelId(maxThinkingTokens);
    const changed =
      currentMaxThinkingTokens !== maxThinkingTokens ||
      currentThoughtLevelId !== nextThoughtLevelId;
    session.sessionConfig.maxThinkingTokens = maxThinkingTokens;
    session.sessionConfig.thoughtLevelId = nextThoughtLevelId;
    return changed;
  }

  private isKnownSessionConfigValue(
    options: SessionConfigSelectOption[],
    value: string,
  ): value is string {
    return options.some((option) => option.value === value);
  }

  private trackBackgroundTaskFromNotification(notification: SessionNotification): void {
    if (notification.update.sessionUpdate !== "tool_call_update") {
      return;
    }

    const update = notification.update as SessionNotification["update"] & {
      toolCallId?: string;
      _meta?: { claudeCode?: ToolUpdateMeta["claudeCode"] };
    };

    if (typeof update.toolCallId !== "string") {
      return;
    }

    const claudeCodeMeta = update._meta?.claudeCode;
    if (!claudeCodeMeta) {
      return;
    }

    const taskId = claudeCodeMeta.backgroundTaskId;
    const outputFile = claudeCodeMeta.backgroundOutputFile;

    if (typeof taskId !== "string" && typeof outputFile !== "string") {
      return;
    }

    const mapping: BackgroundTaskToolCall = {
      sessionId: notification.sessionId,
      toolCallId: update.toolCallId,
      toolName: claudeCodeMeta.toolName,
      outputFile,
    };

    if (typeof taskId === "string") {
      this.backgroundTaskToolCalls[taskId] = mapping;
    }
    if (typeof outputFile === "string" && outputFile.length > 0) {
      this.backgroundTaskToolCallsByOutputFile[outputFile] = mapping;
    }
  }

  private async sendSessionUpdate(notification: SessionNotification): Promise<void> {
    this.trackBackgroundTaskFromNotification(notification);
    await this.client.sessionUpdate(notification);
  }

  private closeSessionState(sessionId: string): boolean {
    const session = this.sessions[sessionId];
    if (!session) {
      return false;
    }

    // Close all queries in history (multi-query support)
    for (const query of session.queryHistory) {
      const queryWithClose = query as Query & { close?: () => void };
      if (typeof queryWithClose.close === "function") {
        try {
          queryWithClose.close();
        } catch (error) {
          // Suppress 404 errors from SDK cleanup - these are benign
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes("404")) {
            this.logger.error(`[closeSessionState] Failed to close query for ${sessionId}`, error);
          }
        }
      }
    }

    for (const [taskId, mapping] of Object.entries(this.backgroundTaskToolCalls)) {
      if (mapping.sessionId === sessionId) {
        delete this.backgroundTaskToolCalls[taskId];
      }
    }
    for (const [outputFile, mapping] of Object.entries(this.backgroundTaskToolCallsByOutputFile)) {
      if (mapping.sessionId === sessionId) {
        delete this.backgroundTaskToolCallsByOutputFile[outputFile];
      }
    }
    this.completedBackgroundTaskIds = this.completedBackgroundTaskIds.filter(
      (entry) => !entry.startsWith(`${sessionId}:`),
    );

    delete this.sessions[sessionId];
    return true;
  }

  /**
   * Start a fresh SDK query for context clearing.
   * 
   * This is the KEY to implementing true context clearing:
   * - Creates a new query() WITHOUT the 'resume' option
   * - Replaces the session's current query and input stream
   * - Sends the initial prompt to start the fresh conversation
   * 
   * @param sessionId - ACP session ID
   * @param initialPrompt - First message for the fresh conversation
   * @param clearContext - If true, creates fresh query; if false, resumes existing
   */
  private async startFreshQuery(
    sessionId: string,
    initialPrompt: string,
    clearContext: boolean = true,
  ): Promise<void> {
    const session = this.getSessionOrThrow(sessionId);

    this.logger.log(`[startFreshQuery] Starting ${clearContext ? 'fresh' : 'resumed'} query for session ${sessionId}`);

    // 1. Close the old query gracefully
    const oldQuery = session.query as Query & { close?: () => void };
    if (typeof oldQuery.close === "function") {
      try {
        oldQuery.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("404")) {
          this.logger.error(`[startFreshQuery] Failed to close old query for ${sessionId}`, error);
        }
      }
    }

    // 2. Create new input stream
    const newInput = new Pushable<SDKUserMessage>();

    // 3. Build minimal options - KEY: omit 'resume' if clearing context!
    // For now, use minimal options. Full options builder can be added later if needed.
    const baseOptions = {
      permissionMode: session.permissionMode,
      canUseTool: this.canUseTool(sessionId),
      includePartialMessages: session.sessionConfig.enablePartialMessagesValueId === "enabled",
      allowDangerouslySkipPermissions: ALLOW_BYPASS,
    } as Options;

    // If NOT clearing context, add resume option to continue conversation
    if (!clearContext && session.sdkSessionId) {
      baseOptions.resume = session.sdkSessionId;
    }

    // 4. Create new query
    const newQuery = query({
      prompt: newInput,
      options: baseOptions,
    });

    // 5. Update session state
    session.query = newQuery;
    session.input = newInput;
    session.queryHistory.push(newQuery);
    session.contextCleared = clearContext;

    // 6. Send initial prompt to start conversation
    // Use the same format as promptToClaude
    newInput.push({
      type: "user",
      message: {
        role: "user",
        content: [{ type: "text", text: initialPrompt }],
      },
      session_id: session.sdkSessionId ?? sessionId,
      parent_tool_use_id: null,
    });

    this.logger.log(`[startFreshQuery] Fresh query started for session ${sessionId} (context cleared: ${clearContext})`);
  }

  private getSessionIdExtParam(method: string, params: Record<string, unknown>): string {
    if (typeof params.sessionId !== "string" || params.sessionId.length === 0) {
      throw RequestError.invalidParams(
        params,
        `Extension method '${method}' requires a non-empty string 'sessionId'`,
      );
    }
    return params.sessionId;
  }

  private async streamInputToSession(session: Session, message: SDKUserMessage): Promise<void> {
    const queryWithStreamInput = session.query as Query & {
      streamInput?: (stream: AsyncIterable<SDKUserMessage>) => Promise<void>;
    };

    if (typeof queryWithStreamInput.streamInput === "function") {
      const stream = (async function* () {
        yield message;
      })();
      await queryWithStreamInput.streamInput(stream);
      return;
    }

    session.input.push(message);
  }

  private async refreshSessionInfo(sessionId: string): Promise<Record<string, unknown>> {
    const session = this.getSessionOrThrow(sessionId);
    const queryWithAccountInfo = session.query as Query & {
      accountInfo?: () => Promise<unknown>;
      mcpServerStatus?: () => Promise<unknown>;
    };

    if (typeof queryWithAccountInfo.accountInfo === "function") {
      session.sessionConfig.accountInfo = await queryWithAccountInfo.accountInfo();
    }

    let mcpServers: unknown = undefined;
    if (typeof queryWithAccountInfo.mcpServerStatus === "function") {
      try {
        mcpServers = await queryWithAccountInfo.mcpServerStatus();
      } catch (error) {
        this.logger.error(
          `[refreshSessionInfo] Failed to fetch MCP server status for session ${sessionId}`,
          error,
        );
      }
    }

    await this.sendSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "session_info_update",
        updatedAt: new Date().toISOString(),
        _meta: {
          claudeCode: {
            accountInfo: session.sessionConfig.accountInfo,
            model: session.sessionConfig.modelId,
            outputStyle: session.sessionConfig.outputStyleId,
            ...(mcpServers !== undefined ? { mcpServers } : {}),
          },
        },
      },
    });

    return {
      ok: true,
      accountInfo: session.sessionConfig.accountInfo,
      ...(mcpServers !== undefined ? { mcpServers } : {}),
    };
  }

  private async refreshAvailableCommands(
    sessionId: string,
    commandsFromSdk?: SlashCommand[],
  ): Promise<void> {
    const session = this.sessions[sessionId];
    if (!session) {
      return;
    }

    let commands = commandsFromSdk;
    if (!commands) {
      try {
        commands = await session.query.supportedCommands();
      } catch (error) {
        this.logger.error(
          `[refreshAvailableCommands] Failed to fetch supported commands for session ${sessionId}`,
          error,
        );
        return;
      }
    }

    const availableCommands = getAvailableSlashCommands(commands);
    if (availableCommandsEqual(session.lastAvailableCommands, availableCommands)) {
      return;
    }

    session.lastAvailableCommands = availableCommands;
    await this.sendSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "available_commands_update",
        availableCommands,
      },
    });
  }

  private async emitUsageUpdate(
    sessionId: string,
    message: SDKResultMessage,
  ): Promise<PromptResponse["usage"] | undefined> {
    const usage = mapSdkUsageToAcpUsage(message.usage);
    if (!usage) {
      return undefined;
    }

    const contextWindow = estimateContextWindowFromModelUsage(message.modelUsage);
    const used = usage.totalTokens;
    const size = Math.max(contextWindow ?? used, used);
    const cost = Number.isFinite(message.total_cost_usd)
      ? {
          amount: message.total_cost_usd,
          currency: "USD",
        }
      : undefined;

    await this.sendSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "usage_update",
        used,
        size,
        cost,
        _meta: {
          claudeCode: {
            usage: message.usage,
            modelUsage: message.modelUsage,
            permissionDenials: message.permission_denials,
            structuredOutput: message.subtype === "success" ? message.structured_output : undefined,
            resultSubtype: message.subtype,
          },
        },
      },
    });

    return usage;
  }

  private buildPromptResponse(
    stopReason: PromptResponse["stopReason"],
    result: SDKResultMessage,
    usage?: PromptResponse["usage"],
  ): PromptResponse {
    const response: PromptResponse = {
      stopReason,
      _meta: {
        claudeCode: buildResultMeta(result),
      },
    };
    if (usage) {
      response.usage = usage;
    }
    return response;
  }

  private async handleAskUserQuestionPermission(
    sessionId: string,
    toolUseID: string,
    toolInput: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<PermissionResult> {
    const rawQuestions = toolInput.questions;
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return {
        behavior: "deny",
        message: "AskUserQuestion requires at least one question",
        interrupt: true,
      };
    }

    const answers: Record<string, string> = {};

    for (let questionIndex = 0; questionIndex < rawQuestions.length; questionIndex += 1) {
      const rawQuestion = rawQuestions[questionIndex];
      if (!isRecord(rawQuestion)) {
        return {
          behavior: "deny",
          message: "AskUserQuestion question payload is invalid",
          interrupt: true,
        };
      }

      const questionText = typeof rawQuestion.question === "string" ? rawQuestion.question : null;
      const header =
        typeof rawQuestion.header === "string" && rawQuestion.header.length > 0
          ? rawQuestion.header
          : null;
      const rawOptions = Array.isArray(rawQuestion.options) ? rawQuestion.options : [];
      if (!questionText || rawOptions.length === 0) {
        return {
          behavior: "deny",
          message: "AskUserQuestion requires question text and options",
          interrupt: true,
        };
      }

      const options = rawOptions
        .map((rawOption, optionIndex) => {
          if (!isRecord(rawOption)) {
            return null;
          }
          const label = typeof rawOption.label === "string" ? rawOption.label : null;
          const description =
            typeof rawOption.description === "string" ? rawOption.description : null;
          if (!label || !description) {
            return null;
          }
          return {
            kind: "allow_once" as const,
            optionId: `ask:${questionIndex}:${optionIndex}`,
            name: `${label} - ${description}`,
            label,
          };
        })
        .filter(
          (
            option,
          ): option is { kind: "allow_once"; optionId: string; name: string; label: string } =>
            option !== null,
        );

      if (options.length === 0) {
        return {
          behavior: "deny",
          message: "AskUserQuestion options are invalid",
          interrupt: true,
        };
      }

      const cancelOptionId = `ask:${questionIndex}:cancel`;
      const response = await this.client.requestPermission({
        sessionId,
        options: [
          ...options.map((option) => ({
            kind: option.kind,
            optionId: option.optionId,
            name: option.name,
          })),
          {
            kind: "reject_once",
            optionId: cancelOptionId,
            name: "Cancel",
          },
        ],
        toolCall: {
          toolCallId: `${toolUseID}:${questionIndex}`,
          rawInput: rawQuestion,
          title: header ? `Ask user: ${header}` : "Ask user question",
        },
      });

      if (signal.aborted || response.outcome?.outcome === "cancelled") {
        throw new Error("Tool use aborted");
      }
      if (response.outcome?.outcome !== "selected") {
        return {
          behavior: "deny",
          message: "User cancelled AskUserQuestion",
          interrupt: true,
        };
      }
      if (response.outcome.optionId === cancelOptionId) {
        return {
          behavior: "deny",
          message: "User declined to answer AskUserQuestion",
          interrupt: true,
        };
      }

      const selectedOption = options.find(
        (option) => option.optionId === response.outcome.optionId,
      );
      if (!selectedOption) {
        return {
          behavior: "deny",
          message: "Selected AskUserQuestion option was not recognized",
          interrupt: true,
        };
      }
      answers[questionText] = selectedOption.label;
    }

    return {
      behavior: "allow",
      updatedInput: {
        ...toolInput,
        answers,
      },
    };
  }

  private async updateBackgroundTaskToolCallStatus(
    sessionId: string,
    task: {
      task_id: string;
      status: "completed" | "failed" | "stopped";
      summary: string;
      output_file: string;
    },
  ): Promise<void> {
    if (this.hasCompletedBackgroundTask(sessionId, task.task_id)) {
      return;
    }

    const mapping =
      this.backgroundTaskToolCalls[task.task_id] ||
      this.backgroundTaskToolCallsByOutputFile[task.output_file];
    if (!mapping || mapping.sessionId !== sessionId) {
      return;
    }

    const status = task.status === "completed" ? "completed" : "failed";
    const content = task.summary
      ? [
          {
            type: "content" as const,
            content: {
              type: "text" as const,
              text: task.summary,
            },
          },
        ]
      : undefined;

    await this.sendSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: mapping.toolCallId,
        status,
        title: `Background task ${task.status}`,
        content,
        locations: task.output_file ? [{ path: task.output_file }] : undefined,
        _meta: {
          claudeCode: {
            toolName: mapping.toolName,
            backgroundTaskId: task.task_id,
            backgroundOutputFile: task.output_file,
            taskStatus: task.status,
          },
        } satisfies ToolUpdateMeta,
      },
    });

    this.rememberCompletedBackgroundTask(sessionId, task.task_id);
    delete this.backgroundTaskToolCalls[task.task_id];
    delete this.backgroundTaskToolCallsByOutputFile[task.output_file];
    if (mapping.outputFile) {
      delete this.backgroundTaskToolCallsByOutputFile[mapping.outputFile];
    }
  }

  private async handleTaskCompletedHook(
    sessionId: string,
    task: {
      task_id: string;
      task_subject: string;
      task_description?: string;
      teammate_name?: string;
      team_name?: string;
    },
  ): Promise<void> {
    if (this.hasCompletedBackgroundTask(sessionId, task.task_id)) {
      return;
    }

    const mapping = this.backgroundTaskToolCalls[task.task_id];
    if (mapping && mapping.sessionId !== sessionId) {
      return;
    }

    const outputFile = mapping?.outputFile;
    const outputTail =
      outputFile && outputFile.length > 0 ? await this.readOutputFileTail(outputFile) : null;
    const subject = task.task_subject.trim();
    const details = task.task_description?.trim();
    const teammate = task.teammate_name?.trim();

    const lines = [
      `Background task ${task.task_id} completed${teammate ? ` (${teammate})` : ""}.`,
      subject.length > 0 ? `Subject: ${subject}` : null,
      details && details !== subject ? `Details: ${details}` : null,
      outputFile ? `Output: ${outputFile}` : null,
      outputTail
        ? `Output tail (last ${Math.min(80, outputTail.split(/\r?\n/).length)} lines):\n${outputTail}`
        : null,
    ].filter((line): line is string => !!line);

    if (mapping) {
      await this.sendSessionUpdate({
        sessionId,
        update: {
          sessionUpdate: "tool_call_update",
          toolCallId: mapping.toolCallId,
          status: "completed",
          title: "Background task completed",
          content: subject
            ? [
                {
                  type: "content",
                  content: {
                    type: "text",
                    text: subject,
                  },
                },
              ]
            : undefined,
          locations: outputFile ? [{ path: outputFile }] : undefined,
          _meta: {
            claudeCode: {
              toolName: mapping.toolName,
              backgroundTaskId: task.task_id,
              backgroundOutputFile: outputFile,
              taskStatus: "completed",
            },
          } satisfies ToolUpdateMeta,
        },
      });
    }

    await this.sendSessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: {
          type: "text",
          text: lines.join("\n"),
        },
      },
    });

    this.rememberCompletedBackgroundTask(sessionId, task.task_id);
    delete this.backgroundTaskToolCalls[task.task_id];
    if (outputFile) {
      delete this.backgroundTaskToolCallsByOutputFile[outputFile];
    }
  }

  private async formatTaskNotificationText(task: {
    task_id: string;
    status: "completed" | "failed" | "stopped";
    summary: string;
    output_file: string;
  }): Promise<string> {
    const summary = task.summary?.trim();
    const statusText = `Background task ${task.task_id} ${task.status}`;
    const withSummary = summary ? `${statusText}: ${summary}` : statusText;
    if (!task.output_file) {
      return withSummary;
    }

    // Include a short tail preview so clients don't need to read massive output files.
    const outputTail = await this.readOutputFileTail(task.output_file);
    if (!outputTail) {
      return `${withSummary}\nOutput: ${task.output_file}`;
    }

    const lineCount = outputTail.split(/\r?\n/).length;
    return (
      `${withSummary}\nOutput: ${task.output_file}` +
      `\nOutput tail (last ${lineCount} lines):\n${outputTail}`
    );
  }

  async initialize(request: InitializeRequest): Promise<InitializeResponse> {
    this.clientCapabilities = request.clientCapabilities;

    // Default authMethod
    const authMethod: any = {
      description: "Run `claude /login` in the terminal",
      name: "Log in with Claude Code",
      id: AUTH_METHOD_ID,
    };

    // If client supports terminal-auth capability, use that instead.
    if (request.clientCapabilities?._meta?.["terminal-auth"] === true) {
      const cliPath = fileURLToPath(import.meta.resolve("@anthropic-ai/claude-agent-sdk/cli.js"));

      authMethod._meta = {
        "terminal-auth": {
          command: "node",
          args: [cliPath, "/login"],
          label: "Claude Code Login",
        },
      };
    }

    return {
      protocolVersion: 1,
      agentCapabilities: {
        promptCapabilities: {
          image: true,
          embeddedContext: true,
        },
        mcpCapabilities: {
          http: true,
          sse: true,
        },
        loadSession: true,
        sessionCapabilities: {
          fork: {},
          list: {},
          resume: {},
        },
      },
      agentInfo: {
        name: packageJson.name,
        title: "Claude Code",
        version: packageJson.version,
      },
      authMethods: [authMethod],
    };
  }

  async newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
    if (
      fs.existsSync(path.resolve(os.homedir(), ".claude.json.backup")) &&
      !fs.existsSync(path.resolve(os.homedir(), ".claude.json"))
    ) {
      throw RequestError.authRequired();
    }

    return await this.createSession(params, {
      // Revisit these meta values once we support resume
      resume: (params._meta as NewSessionMeta | undefined)?.claudeCode?.options?.resume,
    });
  }

  async unstable_forkSession(params: ForkSessionRequest): Promise<ForkSessionResponse> {
    return await this.createSession(
      {
        cwd: params.cwd,
        mcpServers: params.mcpServers ?? [],
        _meta: params._meta,
      },
      {
        resume: params.sessionId,
        forkSession: true,
      },
    );
  }

  async unstable_resumeSession(params: ResumeSessionRequest): Promise<ResumeSessionResponse> {
    const response = await this.createSession(
      {
        cwd: params.cwd,
        mcpServers: params.mcpServers ?? [],
        _meta: params._meta,
      },
      {
        resume: params.sessionId,
      },
    );

    return response;
  }

  async loadSession(params: LoadSessionRequest): Promise<LoadSessionResponse> {
    try {
      await fs.promises.access(sessionFilePath(params.cwd, params.sessionId));
    } catch {
      throw new Error("Session not found");
    }

    const response = await this.createSession(
      {
        cwd: params.cwd,
        mcpServers: params.mcpServers ?? [],
        _meta: params._meta,
      },
      {
        resume: params.sessionId,
      },
    );

    await this.replaySessionHistory(params.sessionId, params.cwd);

    const loadResponse: LoadSessionResponse = {
      modes: response.modes,
      models: response.models,
    };
    if (response.configOptions) {
      loadResponse.configOptions = response.configOptions;
    }
    if (response._meta) {
      loadResponse._meta = response._meta;
    }

    return loadResponse;
  }

  /**
   * List Claude Code sessions by parsing JSONL files
   * Sessions are stored in ~/.claude/projects/<path-encoded>/
   * Implements the draft session/list RFD spec
   */
  async unstable_listSessions(params: ListSessionsRequest): Promise<ListSessionsResponse> {
    // Note: We load all sessions into memory for sorting, so pagination here is for
    // API response size limits rather than memory efficiency. This matches the RFD spec.
    const PAGE_SIZE = 50;
    const claudeDir = path.join(CLAUDE_CONFIG_DIR, "projects");

    try {
      await fs.promises.access(claudeDir);
    } catch {
      return { sessions: [] };
    }

    // Collect all sessions across all project directories
    const allSessions: SessionInfo[] = [];

    try {
      const projectDirs = await fs.promises.readdir(claudeDir);

      for (const encodedPath of projectDirs) {
        const projectDir = path.join(claudeDir, encodedPath);
        const stat = await fs.promises.stat(projectDir);
        if (!stat.isDirectory()) continue;

        // Decode the path based on platform:
        // - Unix: "-Users-morse-project" -> "/Users/morse/project"
        // - Windows: "C-Users-morse-project" -> "C:\Users\morse\project"
        const decodedCwd = decodeProjectPath(encodedPath);

        // Skip if filtering by cwd and this doesn't match
        if (params.cwd && decodedCwd !== params.cwd) continue;

        const files = await fs.promises.readdir(projectDir);
        // Filter to user session files only. Skip agent-*.jsonl files which contain
        // internal agent metadata and system logs, not user-visible conversation sessions.
        const jsonlFiles = files.filter((f) => f.endsWith(".jsonl") && !f.startsWith("agent-"));

        for (const file of jsonlFiles) {
          const filePath = path.join(projectDir, file);
          try {
            const content = await fs.promises.readFile(filePath, "utf-8");
            const lines = content.trim().split("\n").filter(Boolean);

            const firstLine = lines[0];
            if (!firstLine) continue;

            // Parse first line to get session info
            const firstEntry = JSON.parse(firstLine);
            const sessionId = firstEntry.sessionId || file.replace(".jsonl", "");

            // Find first user message for title
            let title: string | undefined;
            for (const line of lines) {
              try {
                const entry = JSON.parse(line);
                if (entry.type === "user" && entry.message?.content) {
                  const msgContent = entry.message.content;
                  if (typeof msgContent === "string") {
                    title = sanitizeTitle(msgContent);
                    break;
                  }
                  if (Array.isArray(msgContent) && msgContent.length > 0) {
                    const first = msgContent[0];
                    const text =
                      typeof first === "string"
                        ? first
                        : first && typeof first === "object" && typeof first.text === "string"
                          ? first.text
                          : undefined;
                    if (text) {
                      title = sanitizeTitle(text);
                      break;
                    }
                  }
                }
              } catch {
                // Skip malformed lines
              }
            }

            // Get file modification time as updatedAt
            const fileStat = await fs.promises.stat(filePath);
            const updatedAt = fileStat.mtime.toISOString();

            allSessions.push({
              sessionId,
              cwd: decodedCwd,
              title: title ?? null,
              updatedAt,
            });
          } catch (err) {
            this.logger.error(
              `[unstable_listSessions] Failed to parse session file: ${filePath}`,
              err,
            );
          }
        }
      }
    } catch (err) {
      this.logger.error("[unstable_listSessions] Failed to list sessions", err);
      return { sessions: [] };
    }

    // Sort by updatedAt descending (most recent first)
    allSessions.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });

    // Handle pagination with cursor
    let startIndex = 0;
    if (params.cursor) {
      try {
        const decoded = Buffer.from(params.cursor, "base64").toString("utf-8");
        const cursorData = JSON.parse(decoded);
        startIndex = cursorData.offset ?? 0;
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const pageOfSessions = allSessions.slice(startIndex, startIndex + PAGE_SIZE);
    const hasMore = startIndex + PAGE_SIZE < allSessions.length;

    const response: ListSessionsResponse = {
      sessions: pageOfSessions,
    };

    if (hasMore) {
      const nextCursor = Buffer.from(JSON.stringify({ offset: startIndex + PAGE_SIZE })).toString(
        "base64",
      );
      response.nextCursor = nextCursor;
    }

    return response;
  }

  async authenticate(_params: AuthenticateRequest): Promise<void> {
    if (_params.methodId !== AUTH_METHOD_ID) {
      throw RequestError.invalidParams(
        { methodId: _params.methodId },
        `Unsupported auth method: ${_params.methodId}`,
      );
    }

    // Authentication is initiated by the client via the advertised auth method
    // (for example terminal-auth command execution). No additional server-side
    // action is required for this adapter.
  }

  async extMethod(
    method: string,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (method) {
      case EXTENSION_METHODS.mcpServerStatus:
      case "mcpServerStatus": {
        const sessionId = this.getSessionIdExtParam(method, params);
        const session = this.getSessionOrThrow(sessionId);
        return {
          mcpServers: await session.query.mcpServerStatus(),
        };
      }
      case EXTENSION_METHODS.reconnectMcpServer:
      case "reconnectMcpServer": {
        const sessionId = this.getSessionIdExtParam(method, params);
        const session = this.getSessionOrThrow(sessionId);
        if (typeof params.serverName !== "string" || params.serverName.length === 0) {
          throw RequestError.invalidParams(
            params,
            `Extension method '${method}' requires a non-empty string 'serverName'`,
          );
        }
        await session.query.reconnectMcpServer(params.serverName);
        return { ok: true };
      }
      case EXTENSION_METHODS.toggleMcpServer:
      case "toggleMcpServer": {
        const sessionId = this.getSessionIdExtParam(method, params);
        const session = this.getSessionOrThrow(sessionId);
        if (typeof params.serverName !== "string" || params.serverName.length === 0) {
          throw RequestError.invalidParams(
            params,
            `Extension method '${method}' requires a non-empty string 'serverName'`,
          );
        }
        if (typeof params.enabled !== "boolean") {
          throw RequestError.invalidParams(
            params,
            `Extension method '${method}' requires a boolean 'enabled'`,
          );
        }
        await session.query.toggleMcpServer(params.serverName, params.enabled);
        return { ok: true };
      }
      case EXTENSION_METHODS.setMcpServers:
      case "setMcpServers": {
        const sessionId = this.getSessionIdExtParam(method, params);
        const session = this.getSessionOrThrow(sessionId);
        if (!isRecord(params.servers) || Array.isArray(params.servers)) {
          throw RequestError.invalidParams(
            params,
            `Extension method '${method}' requires an object 'servers'`,
          );
        }
        const result = await session.query.setMcpServers(
          params.servers as Record<string, McpServerConfig>,
        );
        const hasDynamicServers = Object.keys(params.servers).length > 0;
        const nextValueId = hasDynamicServers ? "custom" : "default";
        const changed = session.sessionConfig.mcpServersValueId !== nextValueId;
        session.sessionConfig.mcpServersValueId = nextValueId;
        if (changed) {
          await this.emitConfigOptionUpdate(sessionId);
        }
        return { result, currentValue: nextValueId };
      }
      case EXTENSION_METHODS.refreshSessionInfo:
      case "refreshSessionInfo": {
        const sessionId = this.getSessionIdExtParam(method, params);
        return this.refreshSessionInfo(sessionId);
      }
      case EXTENSION_METHODS.streamInput:
      case "streamInput": {
        const sessionId = this.getSessionIdExtParam(method, params);
        const session = this.getSessionOrThrow(sessionId);

        let prompt: PromptRequest["prompt"];
        if (typeof params.text === "string") {
          prompt = [{ type: "text", text: params.text }];
        } else if (Array.isArray(params.prompt)) {
          prompt = params.prompt as PromptRequest["prompt"];
        } else {
          throw RequestError.invalidParams(
            params,
            `Extension method '${method}' requires either string 'text' or prompt array 'prompt'`,
          );
        }

        await this.streamInputToSession(
          session,
          promptToClaude({
            sessionId,
            prompt,
          }),
        );
        return { ok: true };
      }
      case EXTENSION_METHODS.closeSession:
      case "closeSession": {
        const sessionId = this.getSessionIdExtParam(method, params);
        return {
          closed: this.closeSessionState(sessionId),
        };
      }
      default:
        throw RequestError.methodNotFound(method);
    }
  }

  async extNotification(method: string, params: Record<string, unknown>): Promise<void> {
    await this.extMethod(method, params);
  }

  private isCommandAvailable(session: Session, commandName: string): boolean {
    const normalizedTarget = normalizeCommandName(commandName);
    return session.lastAvailableCommands.some(
      (command) => normalizeCommandName(command.name) === normalizedTarget,
    );
  }

  private extractSingleTextPrompt(prompt: PromptRequest["prompt"]): string | null {
    if (prompt.length !== 1 || prompt[0].type !== "text") {
      return null;
    }
    return prompt[0].text.trim();
  }

  private async emitLocalSlashMessage(sessionId: string, text: string): Promise<PromptResponse> {
    await this.client.sessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text },
      },
    });
    return { stopReason: "end_turn" };
  }

  private async handleMcpSlashFallback(sessionId: string, args: string): Promise<PromptResponse> {
    const session = this.getSessionOrThrow(sessionId);
    const trimmedArgs = args.trim();
    try {
      if (trimmedArgs.length === 0 || trimmedArgs === "status") {
        const statuses = await session.query.mcpServerStatus();
        const lines = Array.isArray(statuses)
          ? statuses.map((status: unknown) => {
              if (!isRecord(status)) {
                return String(status);
              }
              const name = typeof status.name === "string" ? status.name : "unknown";
              const state = typeof status.status === "string" ? status.status : "unknown";
              return `- ${name}: ${state}`;
            })
          : [JSON.stringify(statuses)];
        return this.emitLocalSlashMessage(sessionId, [`MCP server status:`, ...lines].join("\n"));
      }

      const reconnectMatch = trimmedArgs.match(/^reconnect\s+(.+)$/i);
      if (reconnectMatch) {
        const serverName = reconnectMatch[1].trim();
        await session.query.reconnectMcpServer(serverName);
        return this.emitLocalSlashMessage(sessionId, `Reconnected MCP server: ${serverName}`);
      }

      const toggleMatch = trimmedArgs.match(/^(enable|disable|on|off)\s+(.+)$/i);
      if (toggleMatch) {
        const enable = ["enable", "on"].includes(toggleMatch[1].toLowerCase());
        const serverName = toggleMatch[2].trim();
        await session.query.toggleMcpServer(serverName, enable);
        return this.emitLocalSlashMessage(
          sessionId,
          `${enable ? "Enabled" : "Disabled"} MCP server: ${serverName}`,
        );
      }

      return this.emitLocalSlashMessage(
        sessionId,
        "Supported /mcp compatibility commands: `/mcp`, `/mcp status`, `/mcp reconnect <server>`, `/mcp enable <server>`, `/mcp disable <server>`.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.emitLocalSlashMessage(sessionId, `MCP command failed: ${message}`);
    }
  }

  private async tryHandleLocalSlashCommand(
    sessionId: string,
    prompt: PromptRequest["prompt"],
  ): Promise<PromptResponse | null> {
    const session = this.getSessionOrThrow(sessionId);
    const text = this.extractSingleTextPrompt(prompt);
    if (!text || !text.startsWith("/")) {
      return null;
    }

    const match = text.match(/^\/([^\s]+)(?:\s+(.*))?$/);
    if (!match) {
      return null;
    }

    const command = match[1].toLowerCase();
    const args = match[2] ?? "";

    if (this.isCommandAvailable(session, command)) {
      return null;
    }

    switch (command) {
      case "mcp":
        return this.handleMcpSlashFallback(sessionId, args);
      case "hooks":
        return this.emitLocalSlashMessage(
          sessionId,
          "`/hooks` UI is not available in this SDK-backed ACP session. Manage hooks in `.claude/settings.json`, then continue in this thread.",
        );
      case "fork":
        return this.emitLocalSlashMessage(
          sessionId,
          "`/fork` is not a supported SDK slash command here. In Zed, use “Fork conversation from here”, or start a new thread and resume with fork-session semantics.",
        );
      default:
        return null;
    }
  }

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    const session = this.sessions[params.sessionId];
    if (!session) {
      throw new Error("Session not found");
    }

    session.cancelled = false;
    await this.refreshAvailableCommands(params.sessionId);

    const localSlashResponse = await this.tryHandleLocalSlashCommand(
      params.sessionId,
      params.prompt,
    );
    if (localSlashResponse) {
      return localSlashResponse;
    }

    const { query, input } = session;

    // Keep the primary turn path push-based so output streams immediately in ACP clients.
    input.push(promptToClaude(params));
    while (true) {
      const { value: message, done } = await query.next();
      if (done || !message) {
        if (this.sessions[params.sessionId].cancelled) {
          return { stopReason: "cancelled" };
        }
        break;
      }

      switch (message.type) {
        case "system":
          switch (message.subtype) {
            case "init": {
              if (message.permissionMode) {
                this.updateSessionModeState(
                  this.sessions[params.sessionId],
                  message.permissionMode,
                );
                await this.client.sessionUpdate({
                  sessionId: params.sessionId,
                  update: {
                    sessionUpdate: "current_mode_update",
                    currentModeId: message.permissionMode,
                  },
                });
              }

              let configUpdated = false;
              if (typeof message.model === "string" && message.model.length > 0) {
                configUpdated =
                  this.updateSessionModelState(this.sessions[params.sessionId], message.model) ||
                  configUpdated;
              }
              if (typeof message.output_style === "string" && message.output_style.length > 0) {
                configUpdated =
                  this.updateSessionOutputStyleState(
                    this.sessions[params.sessionId],
                    message.output_style,
                  ) || configUpdated;
              }
              if (configUpdated) {
                await this.emitConfigOptionUpdate(params.sessionId);
              }

              await this.client.sessionUpdate({
                sessionId: params.sessionId,
                update: {
                  sessionUpdate: "session_info_update",
                  updatedAt: new Date().toISOString(),
                  _meta: {
                    claudeCode: {
                      apiKeySource: message.apiKeySource,
                      claudeCodeVersion: message.claude_code_version,
                      cwd: message.cwd,
                      mcpServers: message.mcp_servers,
                      model: message.model,
                      outputStyle: message.output_style,
                      plugins: message.plugins,
                      skills: message.skills,
                      slashCommands: message.slash_commands,
                      tools: message.tools,
                      accountInfo: this.sessions[params.sessionId].sessionConfig.accountInfo,
                    },
                  },
                },
              });
              break;
            }
            case "compact_boundary":
              await this.client.sessionUpdate({
                sessionId: params.sessionId,
                update: {
                  sessionUpdate: "agent_thought_chunk",
                  content: {
                    type: "text",
                    text: `Context compacted (${message.compact_metadata.trigger}, ${message.compact_metadata.pre_tokens} tokens)`,
                  },
                },
              });
              break;
            case "hook_started":
              await this.client.sessionUpdate({
                sessionId: params.sessionId,
                update: {
                  sessionUpdate: "agent_thought_chunk",
                  content: {
                    type: "text",
                    text: `Hook started: ${message.hook_name} (${message.hook_event})`,
                  },
                  _meta: {
                    claudeCode: {
                      hookEvent: message.hook_event,
                      hookId: message.hook_id,
                      hookName: message.hook_name,
                    },
                  },
                },
              });
              break;
            case "task_notification": {
              if (this.hasCompletedBackgroundTask(params.sessionId, message.task_id)) {
                break;
              }
              const notificationText = await this.formatTaskNotificationText(message);
              await this.client.sessionUpdate({
                sessionId: params.sessionId,
                update: {
                  sessionUpdate: "agent_thought_chunk",
                  content: {
                    type: "text",
                    text: notificationText,
                  },
                  _meta: {
                    claudeCode: {
                      outputFile: message.output_file,
                      status: message.status,
                      taskId: message.task_id,
                    },
                  },
                },
              });
              await this.client.sessionUpdate({
                sessionId: params.sessionId,
                update: {
                  sessionUpdate: "agent_message_chunk",
                  content: {
                    type: "text",
                    text: notificationText,
                  },
                },
              });
              await this.updateBackgroundTaskToolCallStatus(params.sessionId, message);
              break;
            }
            case "hook_progress":
              await this.client.sessionUpdate({
                sessionId: params.sessionId,
                update: {
                  sessionUpdate: "agent_thought_chunk",
                  content: {
                    type: "text",
                    text:
                      message.output ||
                      message.stdout ||
                      message.stderr ||
                      `Hook progress: ${message.hook_name}`,
                  },
                  _meta: {
                    claudeCode: {
                      hookEvent: message.hook_event,
                      hookId: message.hook_id,
                      hookName: message.hook_name,
                    },
                  },
                },
              });
              break;
            case "hook_response":
              await this.client.sessionUpdate({
                sessionId: params.sessionId,
                update: {
                  sessionUpdate: "agent_thought_chunk",
                  content: {
                    type: "text",
                    text:
                      message.output ||
                      message.stdout ||
                      message.stderr ||
                      `Hook ${message.hook_name} ${message.outcome}`,
                  },
                  _meta: {
                    claudeCode: {
                      exitCode: message.exit_code,
                      hookEvent: message.hook_event,
                      hookId: message.hook_id,
                      hookName: message.hook_name,
                      outcome: message.outcome,
                    },
                  },
                },
              });
              break;
            case "status":
              if (message.permissionMode) {
                const changed = this.updateSessionModeState(
                  this.sessions[params.sessionId],
                  message.permissionMode,
                );
                await this.client.sessionUpdate({
                  sessionId: params.sessionId,
                  update: {
                    sessionUpdate: "current_mode_update",
                    currentModeId: message.permissionMode,
                  },
                });
                if (changed) {
                  await this.emitConfigOptionUpdate(params.sessionId);
                }
              }

              if (message.status === "compacting") {
                await this.client.sessionUpdate({
                  sessionId: params.sessionId,
                  update: {
                    sessionUpdate: "agent_thought_chunk",
                    content: {
                      type: "text",
                      text: "Compacting context...",
                    },
                  },
                });
              }
              break;
            case "files_persisted":
              await this.client.sessionUpdate({
                sessionId: params.sessionId,
                update: {
                  sessionUpdate: "agent_thought_chunk",
                  content: {
                    type: "text",
                    text:
                      `Persisted ${message.files.length} files` +
                      (message.failed.length > 0 ? ` (${message.failed.length} failed)` : ""),
                  },
                  _meta: {
                    claudeCode: {
                      failed: message.failed,
                      files: message.files,
                      processedAt: message.processed_at,
                    },
                  },
                },
              });
              break;
            default:
              unreachable(message, this.logger);
              break;
          }
          break;
        case "result": {
          if (this.sessions[params.sessionId].cancelled) {
            return { stopReason: "cancelled" };
          }

          const usage = await this.emitUsageUpdate(params.sessionId, message);

          switch (message.subtype) {
            case "success": {
              if (message.result.includes("Please run /login")) {
                throw RequestError.authRequired();
              }
              if (message.is_error) {
                throw RequestError.internalError(undefined, message.result);
              }
              await this.refreshAvailableCommands(params.sessionId);
              return this.buildPromptResponse("end_turn", message, usage);
            }
            case "error_during_execution":
              if (message.is_error) {
                throw RequestError.internalError(
                  undefined,
                  message.errors.join(", ") || message.subtype,
                );
              }
              await this.refreshAvailableCommands(params.sessionId);
              return this.buildPromptResponse("end_turn", message, usage);
            case "error_max_budget_usd":
            case "error_max_turns":
            case "error_max_structured_output_retries":
              if (message.is_error) {
                throw RequestError.internalError(
                  undefined,
                  message.errors.join(", ") || message.subtype,
                );
              }
              await this.refreshAvailableCommands(params.sessionId);
              return this.buildPromptResponse("max_turn_requests", message, usage);
            default:
              unreachable(message, this.logger);
              break;
          }
          break;
        }
        case "stream_event": {
          for (const notification of streamEventToAcpNotifications(
            message,
            params.sessionId,
            this.toolUseCache,
            this.client,
            this.logger,
          )) {
            await this.sendSessionUpdate(notification);
          }
          break;
        }
        case "user":
        case "assistant": {
          if (this.sessions[params.sessionId].cancelled) {
            break;
          }

          if (
            message.type === "user" &&
            typeof message.uuid === "string" &&
            message.uuid.length > 0
          ) {
            const checkpoints = this.sessions[params.sessionId].userMessageCheckpoints;
            if (checkpoints[checkpoints.length - 1] !== message.uuid) {
              checkpoints.push(message.uuid);
              // Prevent unbounded growth for long-lived sessions.
              if (checkpoints.length > 5000) {
                checkpoints.shift();
              }
            }
          }

          if (
            message.type === "assistant" &&
            typeof message.message.model === "string" &&
            message.message.model.length > 0 &&
            message.message.model !== "<synthetic>" &&
            this.updateSessionModelState(this.sessions[params.sessionId], message.message.model)
          ) {
            await this.emitConfigOptionUpdate(params.sessionId);
          }

          // Slash commands like /compact can generate invalid output... doesn't match
          // their own docs: https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-slash-commands#%2Fcompact-compact-conversation-history
          if (
            typeof message.message.content === "string" &&
            message.message.content.includes("<local-command-stdout>")
          ) {
            // Handle /context by sending its reply as regular agent message.
            if (message.message.content.includes("Context Usage")) {
              for (const notification of toAcpNotifications(
                message.message.content
                  .replace("<local-command-stdout>", "")
                  .replace("</local-command-stdout>", ""),
                "assistant",
                params.sessionId,
                this.toolUseCache,
                this.client,
                this.logger,
                { parentToolUseId: message.parent_tool_use_id },
              )) {
                await this.client.sessionUpdate(notification);
              }
            }
            this.logger.log(message.message.content);
            break;
          }

          if (
            typeof message.message.content === "string" &&
            message.message.content.includes("<local-command-stderr>")
          ) {
            this.logger.error(message.message.content);
            break;
          }
          // Skip these user messages for now, since they seem to just be messages we don't want in the feed
          if (
            message.type === "user" &&
            (typeof message.message.content === "string" ||
              (Array.isArray(message.message.content) &&
                message.message.content.length === 1 &&
                message.message.content[0].type === "text"))
          ) {
            break;
          }

          if (
            message.type === "assistant" &&
            message.message.model === "<synthetic>" &&
            Array.isArray(message.message.content) &&
            message.message.content.length === 1 &&
            message.message.content[0].type === "text" &&
            message.message.content[0].text.includes("Please run /login")
          ) {
            throw RequestError.authRequired();
          }

          const content =
            message.type === "assistant"
              ? // Handled by stream events above
                message.message.content.filter((item) => !["text", "thinking"].includes(item.type))
              : message.message.content;

          for (const notification of toAcpNotifications(
            content,
            message.message.role,
            params.sessionId,
            this.toolUseCache,
            this.client,
            this.logger,
            { parentToolUseId: message.parent_tool_use_id },
          )) {
            await this.sendSessionUpdate(notification);
          }
          break;
        }
        case "tool_progress": {
          const progressContext = resolveSubagentToolContext(
            message.parent_tool_use_id,
            this.toolUseCache,
          );
          const baseTitle = `${message.tool_name} (${Math.round(message.elapsed_time_seconds)}s)`;
          const contextualTitle =
            prefixTitleWithSubagentContext(baseTitle, progressContext) ?? baseTitle;
          await this.client.sessionUpdate({
            sessionId: params.sessionId,
            update: {
              sessionUpdate: "tool_call_update",
              toolCallId: message.tool_use_id,
              status: "in_progress",
              title: contextualTitle,
              _meta: {
                claudeCode: {
                  elapsedTimeSeconds: message.elapsed_time_seconds,
                  parentToolUseId: message.parent_tool_use_id,
                  subagentLabel: progressContext?.label,
                  subagentType: progressContext?.subagentType,
                  toolName: message.tool_name,
                },
              },
            },
          });
          break;
        }
        case "tool_use_summary":
          await this.client.sessionUpdate({
            sessionId: params.sessionId,
            update: {
              sessionUpdate: "agent_thought_chunk",
              content: {
                type: "text",
                text: message.summary,
              },
              _meta: {
                claudeCode: {
                  precedingToolUseIds: message.preceding_tool_use_ids,
                },
              },
            },
          });
          break;
        case "auth_status": {
          const authText = [
            ...message.output,
            message.error ? `Error: ${message.error}` : null,
            message.isAuthenticating && message.output.length === 0 ? "Authenticating..." : null,
          ]
            .filter((line): line is string => typeof line === "string" && line.length > 0)
            .join("\n");

          if (authText.length > 0) {
            await this.client.sessionUpdate({
              sessionId: params.sessionId,
              update: {
                sessionUpdate: "agent_thought_chunk",
                content: {
                  type: "text",
                  text: authText,
                },
                _meta: {
                  claudeCode: {
                    error: message.error,
                    isAuthenticating: message.isAuthenticating,
                  },
                },
              },
            });
          }
          break;
        }
        default:
          unreachable(message);
          break;
      }
    }
    throw new Error("Session did not end in result");
  }

  async cancel(params: CancelNotification): Promise<void> {
    if (!this.sessions[params.sessionId]) {
      throw new Error("Session not found");
    }
    this.sessions[params.sessionId].cancelled = true;
    await this.sessions[params.sessionId].query.interrupt();
  }

  async unstable_setSessionModel(
    params: SetSessionModelRequest,
  ): Promise<SetSessionModelResponse | void> {
    const session = this.getSessionOrThrow(params.sessionId);

    if (!this.isKnownSessionConfigValue(session.sessionConfig.modelOptions, params.modelId)) {
      throw RequestError.invalidParams(
        { modelId: params.modelId },
        `Invalid model id: ${params.modelId}`,
      );
    }

    if (session.sessionConfig.modelId === params.modelId) {
      return {};
    }

    await session.query.setModel(params.modelId);
    this.updateSessionModelState(session, params.modelId);
    await this.emitConfigOptionUpdate(params.sessionId);
    return {};
  }

  async setSessionMode(params: SetSessionModeRequest): Promise<SetSessionModeResponse> {
    const session = this.getSessionOrThrow(params.sessionId);
    if (!isPermissionMode(params.modeId)) {
      throw RequestError.invalidParams({ modeId: params.modeId }, `Invalid mode: ${params.modeId}`);
    }

    if (!session.sessionConfig.availableModeIds.includes(params.modeId)) {
      throw RequestError.invalidParams(
        { modeId: params.modeId },
        `Unsupported mode: ${params.modeId}`,
      );
    }

    if (session.sessionConfig.modeId === params.modeId) {
      return {};
    }

    try {
      await session.query.setPermissionMode(params.modeId);
    } catch (error) {
      const errorMessage = error instanceof Error && error.message ? error.message : "Invalid Mode";
      throw new Error(errorMessage);
    }

    this.updateSessionModeState(session, params.modeId);
    await this.client.sessionUpdate({
      sessionId: params.sessionId,
      update: {
        sessionUpdate: "current_mode_update",
        currentModeId: params.modeId,
      },
    });
    await this.emitConfigOptionUpdate(params.sessionId);
    return {};
  }

  async setSessionConfigOption(
    params: SetSessionConfigOptionRequest,
  ): Promise<SetSessionConfigOptionResponse> {
    const session = this.getSessionOrThrow(params.sessionId);
    let changed = false;

    switch (params.configId) {
      case SESSION_CONFIG_IDS.model: {
        if (!this.isKnownSessionConfigValue(session.sessionConfig.modelOptions, params.value)) {
          throw RequestError.invalidParams(
            { configId: params.configId, value: params.value },
            `Invalid value '${params.value}' for config '${params.configId}'`,
          );
        }

        if (session.sessionConfig.modelId !== params.value) {
          await session.query.setModel(params.value);
          changed = this.updateSessionModelState(session, params.value);
        }
        break;
      }
      case SESSION_CONFIG_IDS.mode: {
        if (!isPermissionMode(params.value)) {
          throw RequestError.invalidParams(
            { configId: params.configId, value: params.value },
            `Invalid value '${params.value}' for config '${params.configId}'`,
          );
        }
        if (!session.sessionConfig.availableModeIds.includes(params.value)) {
          throw RequestError.invalidParams(
            { configId: params.configId, value: params.value },
            `Unsupported mode '${params.value}'`,
          );
        }

        if (session.sessionConfig.modeId !== params.value) {
          await session.query.setPermissionMode(params.value);
          changed = this.updateSessionModeState(session, params.value);
          await this.client.sessionUpdate({
            sessionId: params.sessionId,
            update: {
              sessionUpdate: "current_mode_update",
              currentModeId: params.value,
            },
          });
        }
        break;
      }
      case SESSION_CONFIG_IDS.thoughtLevel: {
        if (!(params.value in THOUGHT_LEVEL_TOKEN_LIMITS)) {
          throw RequestError.invalidParams(
            { configId: params.configId, value: params.value },
            `Invalid value '${params.value}' for config '${params.configId}'`,
          );
        }
        const thoughtLevelId = params.value as ThoughtLevelId;
        const targetMaxThinkingTokens = THOUGHT_LEVEL_TOKEN_LIMITS[thoughtLevelId];
        if (
          session.sessionConfig.thoughtLevelId !== thoughtLevelId ||
          session.sessionConfig.maxThinkingTokens !== targetMaxThinkingTokens
        ) {
          await session.query.setMaxThinkingTokens(targetMaxThinkingTokens);
          changed =
            this.updateSessionMaxThinkingTokensState(session, targetMaxThinkingTokens) || changed;
        }
        break;
      }
      case SESSION_CONFIG_IDS.maxThinkingTokens: {
        const maxThinkingTokens = parseMaxValueId(params.value);
        if (Number.isNaN(maxThinkingTokens)) {
          throw RequestError.invalidParams(
            { configId: params.configId, value: params.value },
            `Invalid value '${params.value}' for config '${params.configId}'`,
          );
        }
        if (session.sessionConfig.maxThinkingTokens !== maxThinkingTokens) {
          await session.query.setMaxThinkingTokens(maxThinkingTokens);
          changed = this.updateSessionMaxThinkingTokensState(session, maxThinkingTokens) || changed;
        }
        break;
      }
      case SESSION_CONFIG_IDS.outputStyle: {
        if (
          !this.isKnownSessionConfigValue(session.sessionConfig.outputStyleOptions, params.value)
        ) {
          throw RequestError.invalidParams(
            { configId: params.configId, value: params.value },
            `Invalid value '${params.value}' for config '${params.configId}'`,
          );
        }
        if (session.sessionConfig.outputStyleId !== params.value) {
          const queryWithOutputStyle = session.query as Query & {
            setOutputStyle?: (style: string) => Promise<void>;
          };
          if (typeof queryWithOutputStyle.setOutputStyle === "function") {
            await queryWithOutputStyle.setOutputStyle(params.value);
          }
          changed = this.updateSessionOutputStyleState(session, params.value);
        }
        break;
      }
      case SESSION_CONFIG_IDS.mcpServers: {
        if (params.value !== "default" && params.value !== "custom") {
          throw RequestError.invalidParams(
            { configId: params.configId, value: params.value },
            `Invalid value '${params.value}' for config '${params.configId}'`,
          );
        }

        if (params.value === "custom") {
          if (session.sessionConfig.mcpServersValueId !== "custom") {
            throw RequestError.invalidParams(
              { configId: params.configId, value: params.value },
              "Use extension method 'mcp_set_servers' to define custom MCP servers.",
            );
          }
          break;
        }

        if (session.sessionConfig.mcpServersValueId !== "default") {
          await session.query.setMcpServers({});
          session.sessionConfig.mcpServersValueId = "default";
          changed = true;
        }
        break;
      }
      case SESSION_CONFIG_IDS.rewindPolicy:
      case SESSION_CONFIG_IDS.additionalDirectories:
      case SESSION_CONFIG_IDS.allowedTools:
      case SESSION_CONFIG_IDS.disallowedTools:
      case SESSION_CONFIG_IDS.tools:
      case SESSION_CONFIG_IDS.env:
      case SESSION_CONFIG_IDS.enableFileCheckpointing:
      case SESSION_CONFIG_IDS.persistSession:
      case SESSION_CONFIG_IDS.maxTurns:
      case SESSION_CONFIG_IDS.maxBudgetUsd:
      case SESSION_CONFIG_IDS.sandbox:
        throw RequestError.invalidParams(
          { configId: params.configId, value: params.value },
          `Config option '${params.configId}' is creation-time only. Set it in session _meta.claudeCode.sessionConfig when creating a session.`,
        );
      default:
        throw RequestError.invalidParams(
          { configId: params.configId, value: params.value },
          `Unknown config option id: ${params.configId}`,
        );
    }

    if (changed) {
      await this.emitConfigOptionUpdate(params.sessionId);
    }

    return {
      configOptions: this.getSessionConfigOptions(session),
    };
  }

  private async replaySessionHistory(sessionId: string, cwd: string): Promise<void> {
    const filePath = sessionFilePath(cwd, sessionId);
    const toolUseCache: ToolUseCache = {};
    const stream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const reader = readline.createInterface({ input: stream, crlfDelay: Infinity });

    try {
      for await (const line of reader) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        let entry: SessionHistoryEntry;
        try {
          entry = JSON.parse(trimmed) as SessionHistoryEntry;
        } catch {
          continue;
        }

        if (entry.type !== "user" && entry.type !== "assistant") {
          continue;
        }

        if (entry.isSidechain) {
          continue;
        }

        if (entry.sessionId && entry.sessionId !== sessionId) {
          continue;
        }

        const message = entry.message;
        if (!message) {
          continue;
        }

        const role =
          message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;
        if (!role) {
          continue;
        }

        const content = message.content;
        if (typeof content !== "string" && !Array.isArray(content)) {
          continue;
        }

        for (const notification of toAcpNotifications(
          content,
          role,
          sessionId,
          toolUseCache,
          this.client,
          this.logger,
          {
            registerHooks: false,
            parentToolUseId: entry.parent_tool_use_id,
          },
        )) {
          await this.sendSessionUpdate(notification);
        }
      }
    } finally {
      reader.close();
    }
  }

  async readTextFile(params: ReadTextFileRequest): Promise<ReadTextFileResponse> {
    const response = await this.client.readTextFile(params);
    return response;
  }

  async writeTextFile(params: WriteTextFileRequest): Promise<WriteTextFileResponse> {
    const response = await this.client.writeTextFile(params);
    return response;
  }

  canUseTool(sessionId: string): CanUseTool {
    return async (toolName, toolInput, { signal, suggestions, toolUseID }) => {
      const session = this.sessions[sessionId];
      if (!session) {
        return {
          behavior: "deny",
          message: "Session not found",
          interrupt: true,
        };
      }

      const compatibleToolInput = normalizeToolInputForCompatibility(toolName, toolInput);

      if (toolName === "AskUserQuestion") {
        return this.handleAskUserQuestionPermission(
          sessionId,
          toolUseID,
          compatibleToolInput,
          signal,
        );
      }

      if (toolName === "ExitPlanMode") {
        // Build options array - match Claude Code CLI exactly
        const exitPlanOptions: Array<{
          kind: "allow_always" | "allow_once" | "reject_once";
          name: string;
          optionId: string;
        }> = [];

        // Add bypass options first if available (matches CLI order)
        if (ALLOW_BYPASS) {
          exitPlanOptions.push({
            kind: "allow_always",
            name: "Yes, clear context and bypass permissions",
            optionId: "clearAndBypass",
          });
          exitPlanOptions.push({
            kind: "allow_always",
            name: "Yes, and bypass permissions",
            optionId: "bypassPermissions",
          });
        }
        
        // Standard options
        exitPlanOptions.push({
          kind: "allow_once",
          name: "Yes, manually approve edits",
          optionId: "default",
        });
        
        // Keep planning option last
        exitPlanOptions.push({
          kind: "reject_once",
          name: "No, keep planning",
          optionId: "plan",
        });

        const response = await this.client.requestPermission({
          options: exitPlanOptions,
          sessionId,
          toolCall: {
            toolCallId: toolUseID,
            rawInput: compatibleToolInput,
            title: toolInfoFromToolUse({ name: toolName, input: compatibleToolInput }).title,
          },
        });

        if (signal.aborted || response.outcome?.outcome === "cancelled") {
          throw new Error("Tool use aborted");
        }
        
        // Handle the selected option
        if (response.outcome?.outcome === "selected") {
          const selectedOption = response.outcome.optionId;
          
          // Handle "clear context and bypass"
          if (selectedOption === "clearAndBypass") {
            // ✨ TRUE CONTEXT CLEARING IMPLEMENTATION ✨
            // We now start a fresh SDK query WITHOUT the 'resume' option!
            // This gives Claude a completely clean slate with no conversation history.
            
            session.permissionMode = "bypassPermissions";
            
            await this.client.sessionUpdate({
              sessionId,
              update: {
                sessionUpdate: "current_mode_update",
                currentModeId: "bypassPermissions",
              },
            });
            
            // Start fresh query with cleared context!
            await this.startFreshQuery(
              sessionId,
              `Implement the following plan with full permissions:\n\n${compatibleToolInput.plan}`,
              true  // clearContext = true → fresh SDK conversation!
            );
            
            return {
              behavior: "allow",
              updatedInput: compatibleToolInput,
              updatedPermissions: suggestions ?? [
                { type: "setMode", mode: "bypassPermissions", destination: "session" },
              ],
            };
          }
          
          // Handle other mode switches (bypass, default, acceptEdits)
          if (
            isPermissionMode(selectedOption) &&
            selectedOption !== "plan"
          ) {
            // User approved exit and selected a mode
            session.permissionMode = selectedOption as PermissionMode;
            
            await this.client.sessionUpdate({
              sessionId,
              update: {
                sessionUpdate: "current_mode_update",
                currentModeId: selectedOption,
              },
            });

            return {
              behavior: "allow",
              updatedInput: compatibleToolInput,
              updatedPermissions: suggestions ?? [
                { type: "setMode", mode: selectedOption, destination: "session" },
              ],
            };
          } else {
            // User rejected or chose to keep planning
            return {
              behavior: "deny",
              message: "User rejected request to exit plan mode.",
              interrupt: true,
            };
          }
        }
      }

      if (
        session.permissionMode === "bypassPermissions" ||
        (session.permissionMode === "acceptEdits" && EDIT_TOOL_NAMES.includes(toolName))
      ) {
        return {
          behavior: "allow",
          updatedInput: compatibleToolInput,
          updatedPermissions: suggestions ?? [
            { type: "addRules", rules: [{ toolName }], behavior: "allow", destination: "session" },
          ],
        };
      }

      const response = await this.client.requestPermission({
        options: [
          {
            kind: "allow_always",
            name: "Always Allow",
            optionId: "allow_always",
          },
          { kind: "allow_once", name: "Allow", optionId: "allow" },
          { kind: "reject_once", name: "Reject", optionId: "reject" },
        ],
        sessionId,
        toolCall: {
          toolCallId: toolUseID,
          rawInput: compatibleToolInput,
          title: toolInfoFromToolUse({ name: toolName, input: compatibleToolInput }).title,
        },
      });
      if (signal.aborted || response.outcome?.outcome === "cancelled") {
        throw new Error("Tool use aborted");
      }
      if (
        response.outcome?.outcome === "selected" &&
        (response.outcome.optionId === "allow" || response.outcome.optionId === "allow_always")
      ) {
        // If Claude Code has suggestions, it will update their settings already
        if (response.outcome.optionId === "allow_always") {
          return {
            behavior: "allow",
            updatedInput: compatibleToolInput,
            updatedPermissions: suggestions ?? [
              {
                type: "addRules",
                rules: [{ toolName }],
                behavior: "allow",
                destination: "session",
              },
            ],
          };
        }
        return {
          behavior: "allow",
          updatedInput: compatibleToolInput,
        };
      } else {
        return {
          behavior: "deny",
          message: "User refused permission to run tool",
          interrupt: true,
        };
      }
    };
  }

  private async createSession(
    params: NewSessionRequest,
    creationOpts: { resume?: string; forkSession?: boolean } = {},
  ): Promise<NewSessionResponse> {
    // We want to create a new session id unless it is resume,
    // but not resume + forkSession.
    let sessionId;
    if (creationOpts.forkSession) {
      sessionId = randomUUID();
    } else if (creationOpts.resume) {
      sessionId = creationOpts.resume;
    } else {
      sessionId = randomUUID();
    }

    if (this.sessions[sessionId]) {
      this.closeSessionState(sessionId);
    }

    const input = new Pushable<SDKUserMessage>();

    const settingsManager = new SettingsManager(params.cwd, {
      logger: this.logger,
    });
    await settingsManager.initialize();

    const mcpServers: Record<string, McpServerConfig> = {};
    if (Array.isArray(params.mcpServers)) {
      for (const server of params.mcpServers) {
        if ("type" in server) {
          mcpServers[server.name] = {
            type: server.type,
            url: server.url,
            headers: server.headers
              ? Object.fromEntries(server.headers.map((e) => [e.name, e.value]))
              : undefined,
          };
        } else {
          mcpServers[server.name] = {
            type: "stdio",
            command: server.command,
            args: server.args,
            env: server.env
              ? Object.fromEntries(server.env.map((e) => [e.name, e.value]))
              : undefined,
          };
        }
      }
    }

    // Only add the acp MCP server if built-in tools are not disabled
    if (!params._meta?.disableBuiltInTools) {
      const server = createMcpServer(this, sessionId, this.clientCapabilities);
      mcpServers["acp"] = {
        type: "sdk",
        name: "acp",
        instance: server,
      };
    }

    let systemPrompt: Options["systemPrompt"] = { type: "preset", preset: "claude_code" };
    
    // Priority: sessionConfig > _meta.systemPrompt > default
    const sessionConfigMeta = (params._meta as NewSessionMeta | undefined)?.claudeCode?.sessionConfig;
    if (sessionConfigMeta?.systemPrompt) {
      systemPrompt = sessionConfigMeta.systemPrompt;
    } else if (params._meta?.systemPrompt) {
      // Legacy support for old _meta.systemPrompt format
      const customPrompt = params._meta.systemPrompt;
      if (typeof customPrompt === "string") {
        systemPrompt = customPrompt;
      } else if (
        typeof customPrompt === "object" &&
        "append" in customPrompt &&
        typeof customPrompt.append === "string"
      ) {
        systemPrompt.append = customPrompt.append;
      }
    }

    // Extract options from _meta if provided
    const userProvidedOptions = (params._meta as NewSessionMeta | undefined)?.claudeCode?.options;
    const startupSessionConfig = (params._meta as NewSessionMeta | undefined)?.claudeCode
      ?.sessionConfig;
    const requestedSettingSources = 
      startupSessionConfig?.settingSources ?? 
      userProvidedOptions?.settingSources;
    const effectiveSettingSources =
      Array.isArray(requestedSettingSources) && requestedSettingSources.length > 0
        ? requestedSettingSources
        : (["user", "project", "local"] as const);

    const startupRewindPolicy: RewindPolicyId = startupSessionConfig?.rewindPolicy ?? "acp_wrapper";
    if (
      startupRewindPolicy !== "acp_wrapper" &&
      startupRewindPolicy !== "native" &&
      startupRewindPolicy !== "both"
    ) {
      throw RequestError.invalidParams(
        { configId: SESSION_CONFIG_IDS.rewindPolicy, value: startupSessionConfig?.rewindPolicy },
        `Invalid startup rewind policy: ${startupSessionConfig?.rewindPolicy}`,
      );
    }

    const startupAdditionalDirectories =
      startupSessionConfig?.additionalDirectories ?? userProvidedOptions?.additionalDirectories;
    if (
      startupAdditionalDirectories !== undefined &&
      (!Array.isArray(startupAdditionalDirectories) ||
        startupAdditionalDirectories.some((directory) => typeof directory !== "string"))
    ) {
      throw RequestError.invalidParams(
        { configId: SESSION_CONFIG_IDS.additionalDirectories, value: startupAdditionalDirectories },
        "additionalDirectories must be an array of strings",
      );
    }

    const startupAllowedTools =
      startupSessionConfig?.allowedTools ?? userProvidedOptions?.allowedTools;
    if (
      startupAllowedTools !== undefined &&
      (!Array.isArray(startupAllowedTools) ||
        startupAllowedTools.some((toolName) => typeof toolName !== "string"))
    ) {
      throw RequestError.invalidParams(
        { configId: SESSION_CONFIG_IDS.allowedTools, value: startupAllowedTools },
        "allowedTools must be an array of strings",
      );
    }

    const startupDisallowedTools =
      startupSessionConfig?.disallowedTools ?? userProvidedOptions?.disallowedTools;
    if (
      startupDisallowedTools !== undefined &&
      (!Array.isArray(startupDisallowedTools) ||
        startupDisallowedTools.some((toolName) => typeof toolName !== "string"))
    ) {
      throw RequestError.invalidParams(
        { configId: SESSION_CONFIG_IDS.disallowedTools, value: startupDisallowedTools },
        "disallowedTools must be an array of strings",
      );
    }

    const startupTools = startupSessionConfig?.tools ?? userProvidedOptions?.tools;
    const startupEnv = startupSessionConfig?.env ?? userProvidedOptions?.env;
    const startupEnableFileCheckpointing =
      startupSessionConfig?.enableFileCheckpointing ?? userProvidedOptions?.enableFileCheckpointing;
    const startupPersistSession =
      startupSessionConfig?.persistSession ?? userProvidedOptions?.persistSession;
    const startupMaxTurns = startupSessionConfig?.maxTurns ?? userProvidedOptions?.maxTurns;
    const startupMaxBudgetUsd =
      startupSessionConfig?.maxBudgetUsd ?? userProvidedOptions?.maxBudgetUsd;
    const startupMcpServers = startupSessionConfig?.mcpServers ?? userProvidedOptions?.mcpServers;
    const startupSandbox = startupSessionConfig?.sandbox ?? userProvidedOptions?.sandbox;

    if (
      startupMaxTurns !== undefined &&
      (!Number.isFinite(startupMaxTurns) || startupMaxTurns <= 0)
    ) {
      throw RequestError.invalidParams(
        { configId: SESSION_CONFIG_IDS.maxTurns, value: startupMaxTurns },
        `Invalid startup max turns: ${startupMaxTurns}`,
      );
    }
    if (
      startupMaxBudgetUsd !== undefined &&
      (!Number.isFinite(startupMaxBudgetUsd) || startupMaxBudgetUsd < 0)
    ) {
      throw RequestError.invalidParams(
        { configId: SESSION_CONFIG_IDS.maxBudgetUsd, value: startupMaxBudgetUsd },
        `Invalid startup max budget usd: ${startupMaxBudgetUsd}`,
      );
    }

    const requestedPermissionMode =
      startupSessionConfig?.mode ?? userProvidedOptions?.permissionMode;
    const permissionMode = requestedPermissionMode ?? "default";
    if (!isPermissionMode(permissionMode)) {
      throw RequestError.invalidParams(
        { modeId: requestedPermissionMode },
        `Invalid startup mode: ${requestedPermissionMode}`,
      );
    }
    if (!availablePermissionModes().includes(permissionMode)) {
      throw RequestError.invalidParams(
        { modeId: requestedPermissionMode },
        `Unsupported startup mode: ${requestedPermissionMode}`,
      );
    }

    // Configure thinking tokens from environment variable
    const envMaxThinkingTokens = process.env.MAX_THINKING_TOKENS
      ? parseInt(process.env.MAX_THINKING_TOKENS, 10)
      : undefined;
    let configuredMaxThinkingTokens =
      startupSessionConfig?.maxThinkingTokens ??
      userProvidedOptions?.maxThinkingTokens ??
      envMaxThinkingTokens ??
      undefined;
    if (
      configuredMaxThinkingTokens !== undefined &&
      (!Number.isFinite(configuredMaxThinkingTokens) || configuredMaxThinkingTokens < 0)
    ) {
      throw RequestError.invalidParams(
        {
          configId: SESSION_CONFIG_IDS.maxThinkingTokens,
          value: configuredMaxThinkingTokens,
        },
        `Invalid startup max thinking tokens: ${configuredMaxThinkingTokens}`,
      );
    }
    let thoughtLevelId = inferThoughtLevelId(configuredMaxThinkingTokens);
    if (startupSessionConfig?.thoughtLevel) {
      if (!(startupSessionConfig.thoughtLevel in THOUGHT_LEVEL_TOKEN_LIMITS)) {
        throw RequestError.invalidParams(
          { configId: SESSION_CONFIG_IDS.thoughtLevel, value: startupSessionConfig.thoughtLevel },
          `Invalid startup thought level: ${startupSessionConfig.thoughtLevel}`,
        );
      }
      thoughtLevelId = startupSessionConfig.thoughtLevel;
      configuredMaxThinkingTokens =
        THOUGHT_LEVEL_TOKEN_LIMITS[startupSessionConfig.thoughtLevel] ?? undefined;
    }
    const preferredStartupModel = startupSessionConfig?.model ?? userProvidedOptions?.model;

    const postToolUseHook = createPostToolUseHook(this.logger, {
      onEnterPlanMode: async () => {
        const session = this.sessions[sessionId];
        let modeChanged = false;
        if (session) {
          modeChanged = this.updateSessionModeState(session, "plan");
        }
        await this.client.sessionUpdate({
          sessionId,
          update: {
            sessionUpdate: "current_mode_update",
            currentModeId: "plan",
          },
        });
        if (modeChanged) {
          await this.emitConfigOptionUpdate(sessionId);
        }
      },
      onTaskCompleted: async (task) => {
        await this.handleTaskCompletedHook(sessionId, task);
      },
    });

    const options: Options = {
      systemPrompt,
      stderr: (err) => this.logger.error(err),
      ...userProvidedOptions,
      settingSources: effectiveSettingSources as Options["settingSources"],
      // RewindFiles requires file checkpointing.
      enableFileCheckpointing: startupEnableFileCheckpointing ?? true,
      persistSession: startupPersistSession ?? true,
      additionalDirectories: startupAdditionalDirectories,
      env: startupEnv,
      // Override certain fields that must be controlled by ACP
      cwd: params.cwd,
      includePartialMessages: startupSessionConfig?.enablePartialMessages !== false,
      betas: startupSessionConfig?.betas as Options["betas"],
      outputFormat: startupSessionConfig?.outputFormat,
      agents: startupSessionConfig?.agents,
      fallbackModel: startupSessionConfig?.fallbackModel,
      // TypeScript SDK types may not include these yet, but they exist in runtime
      ...(startupSessionConfig?.user ? { user: startupSessionConfig.user } : {}),
      ...(startupSessionConfig?.cliPath ? { cliPath: startupSessionConfig.cliPath } : {}),
      // settingSources already set above from effectiveSettingSources
      mcpServers: { ...(startupMcpServers || {}), ...mcpServers },
      // If we want bypassPermissions to be an option, we have to allow it here.
      // But it doesn't work in root mode, so we only activate it if it will work.
      allowDangerouslySkipPermissions: ALLOW_BYPASS,
      permissionMode,
      canUseTool: this.canUseTool(sessionId),
      // note: although not documented by the types, passing an absolute path
      // here works to find zed's managed node version.
      executable: process.execPath as any,
      ...(process.env.CLAUDE_CODE_EXECUTABLE && {
        pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_EXECUTABLE,
      }),
      tools: startupTools ?? { type: "preset", preset: "claude_code" },
      maxTurns: startupMaxTurns,
      maxBudgetUsd: startupMaxBudgetUsd,
      sandbox: startupSandbox,
      hooks: {
        ...userProvidedOptions?.hooks,
        PreToolUse: [
          ...(userProvidedOptions?.hooks?.PreToolUse || []),
          {
            hooks: [createPreToolUseHook(settingsManager, this.logger)],
          },
        ],
        PostToolUse: [
          ...(userProvidedOptions?.hooks?.PostToolUse || []),
          {
            hooks: [postToolUseHook],
          },
        ],
        TaskCompleted: [
          ...(userProvidedOptions?.hooks?.TaskCompleted || []),
          {
            hooks: [postToolUseHook],
          },
        ],
      },
      ...creationOpts,
    };
    if (configuredMaxThinkingTokens !== undefined) {
      options.maxThinkingTokens = configuredMaxThinkingTokens;
    }

    if (creationOpts?.resume === undefined || creationOpts?.forkSession) {
      // Set our own session id if not resuming an existing session.
      options.sessionId = sessionId;
    }

    const allowedTools = [...(startupAllowedTools ?? [])];
    const disallowedTools = [...(startupDisallowedTools ?? [])];

    // Check if built-in tools should be disabled
    const disableBuiltInTools = params._meta?.disableBuiltInTools === true;

    if (!disableBuiltInTools) {
      if (startupRewindPolicy === "acp_wrapper") {
        disallowedTools.push("RewindFiles");
      } else if (startupRewindPolicy === "native") {
        disallowedTools.push(acpToolNames.rewindFiles);
      }

      if (this.clientCapabilities?.fs?.readTextFile) {
        allowedTools.push(acpToolNames.read);
        // Keep native Read as a fallback. Some model/toolchain paths still emit Read.
      }
      if (this.clientCapabilities?.fs?.writeTextFile) {
        // Keep native Write/Edit as fallback. Background subagents may not have MCP tools.
      }
      if (this.clientCapabilities?.terminal) {
        allowedTools.push(acpToolNames.bashOutput, acpToolNames.killShell);
        // Keep native Bash tools as fallback. Background subagents may not have MCP tools.
      }
    } else {
      // When built-in tools are disabled, explicitly disallow all of them
      disallowedTools.push(
        acpToolNames.read,
        acpToolNames.write,
        acpToolNames.edit,
        acpToolNames.bash,
        acpToolNames.bashOutput,
        acpToolNames.killShell,
        acpToolNames.rewindFiles,
        acpToolNames.ls,
        acpToolNames.glob,
        acpToolNames.grep,
        acpToolNames.task,
        acpToolNames.agent,
        acpToolNames.taskStop,
        acpToolNames.taskOutput,
        acpToolNames.listMcpResources,
        acpToolNames.readMcpResource,
        acpToolNames.notebookRead,
        acpToolNames.notebookEdit,
        acpToolNames.webSearch,
        acpToolNames.webFetch,
        acpToolNames.todoWrite,
        acpToolNames.config,
        acpToolNames.slashCommand,
        acpToolNames.skill,
        "Read",
        "Write",
        "Edit",
        "Bash",
        "BashOutput",
        "KillShell",
        "RewindFiles",
        "LS",
        "Glob",
        "Grep",
        "Task",
        "Agent",
        "TaskStop",
        "TaskOutput",
        "ListMcpResources",
        "ReadMcpResource",
        "TodoWrite",
        "Config",
        "ExitPlanMode",
        "WebSearch",
        "WebFetch",
        "SlashCommand",
        "Skill",
        "NotebookRead",
        "NotebookEdit",
      );
    }

    if (allowedTools.length > 0) {
      options.allowedTools = allowedTools;
    }
    if (disallowedTools.length > 0) {
      options.disallowedTools = Array.from(new Set(disallowedTools));
    }

    // Handle abort controller from meta options
    const abortController = userProvidedOptions?.abortController;
    if (abortController?.signal.aborted) {
      throw new Error("Cancelled");
    }

    const q = query({
      prompt: input,
      options,
    });

    const checkpointSessionId = creationOpts.resume ?? sessionId;
    const checkpointHistory = await loadUserMessageCheckpoints(params.cwd, checkpointSessionId);

    this.sessions[sessionId] = {
      query: q,
      input: input,
      cancelled: false,
      permissionMode,
      // Multi-query support
      queryHistory: [q],           // Track first query
      sdkSessionId: null,          // Will be set from first system message
      contextCleared: false,       // No context clearing on initial session
      sessionConfig: {
        modeId: permissionMode,
        availableModeIds: availablePermissionModes(),
        modelId: "default",
        modelOptions: [],
        thoughtLevelId,
        maxThinkingTokens: configuredMaxThinkingTokens ?? null,
        outputStyleId: "default",
        outputStyleOptions: [],
        rewindPolicyId: startupRewindPolicy,
        additionalDirectoriesValueId:
          startupAdditionalDirectories && startupAdditionalDirectories.length > 0
            ? "custom"
            : "default",
        allowedToolsValueId:
          startupAllowedTools && startupAllowedTools.length > 0 ? "custom" : "default",
        disallowedToolsValueId:
          startupDisallowedTools && startupDisallowedTools.length > 0 ? "custom" : "default",
        toolsValueId: toToolsConfigValueId(startupTools),
        envValueId: startupEnv && Object.keys(startupEnv).length > 0 ? "custom" : "default",
        enableFileCheckpointingValueId:
          (startupEnableFileCheckpointing ?? true) ? "enabled" : "disabled",
        persistSessionValueId: (startupPersistSession ?? true) ? "enabled" : "disabled",
        maxTurnsValue: startupMaxTurns ?? null,
        maxBudgetUsdValue: startupMaxBudgetUsd ?? null,
        mcpServersValueId: startupMcpServers ? "custom" : "default",
        sandboxValueId: startupSandbox?.enabled ? "enabled" : "disabled",
        accountInfo: null,
        enablePartialMessagesValueId:
          startupSessionConfig?.enablePartialMessages === false ? "disabled" : "enabled",
        betasValueId: startupSessionConfig?.betas ? "custom" : "default",
        systemPromptValueId: startupSessionConfig?.systemPrompt ? "custom" : "default",
        outputFormatValueId: startupSessionConfig?.outputFormat ? "custom" : "default",
        agentsValueId: startupSessionConfig?.agents ? "custom" : "default",
        settingSourcesValueId: startupSessionConfig?.settingSources ? "custom" : "default",
        fallbackModelValueId: startupSessionConfig?.fallbackModel ? "custom" : "default",
        userValueId: startupSessionConfig?.user ? "custom" : "default",
        cliPathValueId: startupSessionConfig?.cliPath ? "custom" : "default",
      },
      settingsManager,
      userMessageCheckpoints: checkpointHistory,
      lastAvailableCommands: [],
    };

    const initializationResult = await q.initializationResult();

    const models = await getAvailableModels(
      q,
      initializationResult.models,
      settingsManager,
      preferredStartupModel,
    );
    const currentSession = this.sessions[sessionId];

    currentSession.sessionConfig.modelId = models.currentModelId;
    currentSession.sessionConfig.modelOptions = models.availableModels.map((model) => ({
      value: model.modelId,
      name: model.name,
      description: model.description,
    }));
    currentSession.sessionConfig.accountInfo = initializationResult.account;

    const availableOutputStyles = Array.from(
      new Set(
        [
          ...initializationResult.available_output_styles,
          initializationResult.output_style,
          startupSessionConfig?.outputStyle,
        ].filter((style): style is string => typeof style === "string" && style.length > 0),
      ),
    );
    if (
      startupSessionConfig?.outputStyle &&
      !availableOutputStyles.includes(startupSessionConfig.outputStyle)
    ) {
      throw RequestError.invalidParams(
        { configId: SESSION_CONFIG_IDS.outputStyle, value: startupSessionConfig.outputStyle },
        `Invalid startup output style: ${startupSessionConfig.outputStyle}`,
      );
    }
    currentSession.sessionConfig.outputStyleOptions = availableOutputStyles.map((style) => ({
      value: style,
      name: style,
    }));
    currentSession.sessionConfig.outputStyleId =
      startupSessionConfig?.outputStyle ?? initializationResult.output_style;

    // Needs to happen after we return the session.
    setTimeout(() => {
      void this.refreshAvailableCommands(sessionId, initializationResult.commands);
    }, 0);

    const availableModes = buildAvailableModes();

    return {
      sessionId,
      configOptions: this.getSessionConfigOptions(currentSession),
      models,
      modes: {
        currentModeId: permissionMode,
        availableModes,
      },
      _meta: {
        claudeCode: {
          accountInfo: initializationResult.account,
          outputStyle: currentSession.sessionConfig.outputStyleId,
        },
      },
    };
  }
}

async function getAvailableModels(
  query: Query,
  models: ModelInfo[],
  settingsManager: SettingsManager,
  preferredModel?: string,
): Promise<SessionModelState> {
  if (models.length === 0) {
    throw new Error("No models available");
  }
  const settings = settingsManager.getSettings();

  let currentModel = models[0];

  const targetModel = preferredModel ?? settings.model;
  if (targetModel) {
    const match = models.find(
      (m) =>
        m.value === targetModel ||
        m.value.includes(targetModel) ||
        targetModel.includes(m.value) ||
        m.displayName.toLowerCase() === targetModel.toLowerCase() ||
        m.displayName.toLowerCase().includes(targetModel.toLowerCase()),
    );
    if (match) {
      currentModel = match;
    } else if (preferredModel) {
      throw RequestError.invalidParams(
        { configId: SESSION_CONFIG_IDS.model, value: preferredModel },
        `Invalid startup model: ${preferredModel}`,
      );
    }
  }

  await query.setModel(currentModel.value);

  return {
    availableModels: models.map((model) => ({
      modelId: model.value,
      name: model.displayName,
      description: model.description,
    })),
    currentModelId: currentModel.value,
  };
}

function getAvailableSlashCommands(commands: SlashCommand[]): AvailableCommand[] {
  return commands.map((command) => {
    const input = command.argumentHint
      ? {
          hint: Array.isArray(command.argumentHint)
            ? command.argumentHint.join(" ")
            : command.argumentHint,
        }
      : null;
    let name = command.name;
    if (command.name.endsWith(" (MCP)")) {
      name = `mcp:${name.replace(" (MCP)", "")}`;
    }
    return {
      name,
      description: command.description || "",
      input,
    };
  });
}

function formatUriAsLink(uri: string): string {
  try {
    if (uri.startsWith("file://")) {
      const path = uri.slice(7); // Remove "file://"
      const name = path.split("/").pop() || path;
      return `[@${name}](${uri})`;
    } else if (uri.startsWith("zed://")) {
      const parts = uri.split("/");
      const name = parts[parts.length - 1] || uri;
      return `[@${name}](${uri})`;
    }
    return uri;
  } catch {
    return uri;
  }
}

function extractTextFromToolResultContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) =>
        item && typeof item === "object" && "text" in item && typeof item.text === "string"
          ? item.text
          : "",
      )
      .filter(Boolean)
      .join("\n");
  }

  if (content && typeof content === "object") {
    if ("task_id" in content && typeof content.task_id === "string") {
      const outputFile =
        "output_file" in content && typeof content.output_file === "string"
          ? `\noutput_file: ${content.output_file}`
          : "";
      return `task_id: ${content.task_id}${outputFile}`;
    }
    try {
      return JSON.stringify(content);
    } catch {
      return "";
    }
  }

  return "";
}

function extractBackgroundTaskMetadata(content: unknown): {
  taskId?: string;
  outputFile?: string;
} {
  const text = extractTextFromToolResultContent(content);
  let taskId: string | undefined;
  let outputFile: string | undefined;

  if (content && typeof content === "object" && !Array.isArray(content)) {
    if ("task_id" in content && typeof content.task_id === "string") {
      taskId = content.task_id;
    }
    if ("output_file" in content && typeof content.output_file === "string") {
      outputFile = content.output_file;
    }
  }

  if (!taskId) {
    const taskTagMatch = text.match(/<task-id>([^<]+)<\/task-id>/i);
    if (taskTagMatch) {
      taskId = taskTagMatch[1].trim();
    }
  }

  if (!outputFile) {
    const outputTagMatch = text.match(/<output-file>([^<]+)<\/output-file>/i);
    if (outputTagMatch) {
      outputFile = outputTagMatch[1].trim();
    }
  }

  if (!taskId) {
    let match = text.match(/["']task_id["']\s*:\s*["']([A-Za-z0-9._:-]+)["']/i);
    if (!match) {
      match = text.match(/\btask[_\s-]*id\b\s*[:=]\s*([A-Za-z0-9._:-]+)/i);
    }
    if (!match) {
      match = text.match(/\bbackground(?:\s+\w+){0,4}\s+id\b\s*[:=]\s*([A-Za-z0-9._:-]+)/i);
    }
    if (match) {
      taskId = match[1];
    }
  }

  if (!outputFile) {
    const patterns = [
      /["']?output[_\s-]*file["']?\s*[:=]\s*["']?([^\n"']+)["']?/i,
      /\boutput\s+is\s+being\s+written\s+to\s*:\s*([^\n]+)/i,
    ];

    for (const pattern of patterns) {
      const outputFileMatch = text.match(pattern);
      if (outputFileMatch) {
        outputFile = outputFileMatch[1].trim();
        break;
      }
    }
  }

  return { taskId, outputFile };
}

export function promptToClaude(prompt: PromptRequest): SDKUserMessage {
  const content: any[] = [];
  const context: any[] = [];

  for (const chunk of prompt.prompt) {
    switch (chunk.type) {
      case "text": {
        let text = chunk.text;
        // change /mcp:server:command args -> /server:command (MCP) args
        const mcpMatch = text.match(/^\/mcp:([^:\s]+):(\S+)(\s+.*)?$/);
        if (mcpMatch) {
          const [, server, command, args] = mcpMatch;
          text = `/${server}:${command} (MCP)${args || ""}`;
        }
        content.push({ type: "text", text });
        break;
      }
      case "resource_link": {
        const formattedUri = formatUriAsLink(chunk.uri);
        content.push({
          type: "text",
          text: formattedUri,
        });
        break;
      }
      case "resource": {
        const formattedUri = formatUriAsLink(chunk.resource.uri);
        content.push({
          type: "text",
          text: formattedUri,
        });

        if ("text" in chunk.resource) {
          context.push({
            type: "text",
            text: `\n<context ref="${chunk.resource.uri}">\n${chunk.resource.text}\n</context>`,
          });
        }
        break;
      }
      case "image":
        if (chunk.data) {
          content.push({
            type: "image",
            source: {
              type: "base64",
              data: chunk.data,
              media_type: chunk.mimeType,
            },
          });
        } else if (chunk.uri && chunk.uri.startsWith("http")) {
          content.push({
            type: "image",
            source: {
              type: "url",
              url: chunk.uri,
            },
          });
        }
        break;
      case "audio": {
        // Claude Code SDK does not currently expose an input-audio block type for user prompts.
        // Preserve audio references as text context instead of silently dropping them.
        if ("uri" in chunk && typeof chunk.uri === "string" && chunk.uri.length > 0) {
          content.push({
            type: "text",
            text: `[audio] ${formatUriAsLink(chunk.uri)}`,
          });
        } else {
          const mimeType =
            "mimeType" in chunk && typeof chunk.mimeType === "string" ? ` (${chunk.mimeType})` : "";
          content.push({
            type: "text",
            text: `[audio attachment${mimeType}]`,
          });
        }
        break;
      }
      // Ignore unsupported types
      default:
        break;
    }
  }

  content.push(...context);

  return {
    type: "user",
    message: {
      role: "user",
      content: content,
    },
    session_id: prompt.sessionId,
    parent_tool_use_id: null,
  };
}

/**
 * Convert an SDKAssistantMessage (Claude) to a SessionNotification (ACP).
 * Only handles text, image, and thinking chunks for now.
 */
export function toAcpNotifications(
  content: string | ContentBlockParam[] | BetaContentBlock[] | BetaRawContentBlockDelta[],
  role: "assistant" | "user",
  sessionId: string,
  toolUseCache: ToolUseCache,
  client: AgentSideConnection,
  logger: Logger,
  options?: { registerHooks?: boolean; parentToolUseId?: string | null },
): SessionNotification[] {
  const registerHooks = options?.registerHooks !== false;
  const subagentContext = resolveSubagentToolContext(options?.parentToolUseId, toolUseCache);
  if (typeof content === "string") {
    return [
      {
        sessionId,
        update: {
          sessionUpdate: role === "assistant" ? "agent_message_chunk" : "user_message_chunk",
          content: {
            type: "text",
            text: content,
          },
        },
      },
    ];
  }

  const output = [];
  // Only handle the first chunk for streaming; extend as needed for batching
  for (const chunk of content) {
    let update: SessionNotification["update"] | null = null;
    switch (chunk.type) {
      case "text":
      case "text_delta":
        update = {
          sessionUpdate: role === "assistant" ? "agent_message_chunk" : "user_message_chunk",
          content: {
            type: "text",
            text: chunk.text,
          },
        };
        break;
      case "image":
        update = {
          sessionUpdate: role === "assistant" ? "agent_message_chunk" : "user_message_chunk",
          content: {
            type: "image",
            data: chunk.source.type === "base64" ? chunk.source.data : "",
            mimeType: chunk.source.type === "base64" ? chunk.source.media_type : "",
            uri: chunk.source.type === "url" ? chunk.source.url : undefined,
          },
        };
        break;
      case "thinking":
      case "thinking_delta":
        update = {
          sessionUpdate: "agent_thought_chunk",
          content: {
            type: "text",
            text: chunk.thinking,
          },
        };
        break;
      case "tool_use":
      case "server_tool_use":
      case "mcp_tool_use": {
        toolUseCache[chunk.id] = chunk;
        if (chunk.name === "TodoWrite" || chunk.name === acpToolNames.todoWrite) {
          // @ts-expect-error - sometimes input is empty object
          if (Array.isArray(chunk.input.todos)) {
            update = {
              sessionUpdate: "plan",
              entries: planEntries(chunk.input as { todos: ClaudePlanEntry[] }),
            };
          }
        } else {
          if (registerHooks) {
            registerHookCallback(chunk.id, {
              onPostToolUseHook: async (toolUseId, toolInput, toolResponse) => {
                const toolUse = toolUseCache[toolUseId];
                if (toolUse) {
                  const update: SessionNotification["update"] = {
                    _meta: {
                      claudeCode: {
                        toolResponse,
                        toolName: toolUse.name,
                      },
                    } satisfies ToolUpdateMeta,
                    toolCallId: toolUseId,
                    sessionUpdate: "tool_call_update",
                  };
                  await client.sessionUpdate({
                    sessionId,
                    update,
                  });
                } else {
                  logger.error(
                    `[claude-code-acp] Got a tool response for tool use that wasn't tracked: ${toolUseId}`,
                  );
                }
              },
            });
          }

          let rawInput;
          try {
            rawInput = JSON.parse(JSON.stringify(chunk.input));
          } catch {
            // ignore if we can't turn it to JSON
          }
          const toolInfo = toolInfoFromToolUse(chunk);
          const contextualTitle = prefixTitleWithSubagentContext(toolInfo.title, subagentContext);
          update = {
            _meta: {
              claudeCode: {
                parentToolUseId: subagentContext?.parentToolUseId,
                subagentLabel: subagentContext?.label,
                subagentType: subagentContext?.subagentType,
                toolName: chunk.name,
              },
            } satisfies ToolUpdateMeta,
            toolCallId: chunk.id,
            sessionUpdate: "tool_call",
            rawInput,
            status: "pending",
            ...toolInfo,
            ...(contextualTitle ? { title: contextualTitle } : {}),
          };
        }
        break;
      }

      case "tool_result":
      case "tool_search_tool_result":
      case "web_fetch_tool_result":
      case "web_search_tool_result":
      case "code_execution_tool_result":
      case "bash_code_execution_tool_result":
      case "text_editor_code_execution_tool_result":
      case "mcp_tool_result": {
        const toolUse = toolUseCache[chunk.tool_use_id];
        if (!toolUse) {
          logger.error(
            `[claude-code-acp] Got a tool result for tool use that wasn't tracked: ${chunk.tool_use_id}`,
          );
          break;
        }

        if (toolUse.name !== "TodoWrite" && toolUse.name !== acpToolNames.todoWrite) {
          const isBackgroundTaskTool =
            (toolUse.name === "Task" ||
              toolUse.name === "Agent" ||
              toolUse.name === acpToolNames.task ||
              toolUse.name === acpToolNames.agent) &&
            !!(
              toolUse.input &&
              typeof toolUse.input === "object" &&
              "run_in_background" in toolUse.input &&
              toolUse.input.run_in_background
            );
          const backgroundTaskMeta = isBackgroundTaskTool
            ? extractBackgroundTaskMetadata(chunk.content)
            : {};
          const toolResultUpdate = toolUpdateFromToolResult(chunk, toolUseCache[chunk.tool_use_id]);
          const contextualTitle = prefixTitleWithSubagentContext(
            toolResultUpdate.title,
            subagentContext,
          );

          update = {
            _meta: {
              claudeCode: {
                parentToolUseId: subagentContext?.parentToolUseId,
                toolName: toolUse.name,
                backgroundTaskId: backgroundTaskMeta.taskId,
                backgroundOutputFile: backgroundTaskMeta.outputFile,
                subagentType: subagentContext?.subagentType,
                subagentLabel: subagentContext?.label,
              },
            } satisfies ToolUpdateMeta,
            toolCallId: chunk.tool_use_id,
            sessionUpdate: "tool_call_update",
            status:
              "is_error" in chunk && chunk.is_error
                ? "failed"
                : isBackgroundTaskTool
                  ? "in_progress"
                  : "completed",
            rawOutput: chunk.content,
            ...toolResultUpdate,
            ...(contextualTitle ? { title: contextualTitle } : {}),
          };
        }
        break;
      }

      case "document": {
        const title =
          "title" in chunk && typeof chunk.title === "string" && chunk.title.length > 0
            ? chunk.title
            : null;

        update = {
          sessionUpdate: role === "assistant" ? "agent_message_chunk" : "user_message_chunk",
          content: {
            type: "text",
            text: title ? `[document] ${title}` : "[document]",
          },
        };
        break;
      }

      case "search_result": {
        const title = "title" in chunk && typeof chunk.title === "string" ? chunk.title : "Result";
        const source =
          "source" in chunk && typeof chunk.source === "string" && chunk.source.length > 0
            ? ` (${chunk.source})`
            : "";

        update = {
          sessionUpdate: role === "assistant" ? "agent_message_chunk" : "user_message_chunk",
          content: {
            type: "text",
            text: `[search] ${title}${source}`,
          },
        };
        break;
      }

      case "redacted_thinking":
        update = {
          sessionUpdate: "agent_thought_chunk",
          content: {
            type: "text",
            text: "[redacted thinking]",
          },
        };
        break;

      case "container_upload":
        update = {
          sessionUpdate: role === "assistant" ? "agent_message_chunk" : "user_message_chunk",
          content: {
            type: "text",
            text: `Container upload: ${chunk.file_id}`,
          },
        };
        break;

      case "compaction":
      case "compaction_delta":
        if (typeof chunk.content === "string" && chunk.content.length > 0) {
          update = {
            sessionUpdate: "agent_thought_chunk",
            content: {
              type: "text",
              text: chunk.content,
            },
          };
        }
        break;

      case "input_json_delta":
      case "citations_delta":
      case "signature_delta":
        break;

      default:
        unreachable(chunk, logger);
        break;
    }
    if (update) {
      output.push({ sessionId, update });
    }
  }

  return output;
}

export function streamEventToAcpNotifications(
  message: SDKPartialAssistantMessage,
  sessionId: string,
  toolUseCache: ToolUseCache,
  client: AgentSideConnection,
  logger: Logger,
): SessionNotification[] {
  const event = message.event;
  switch (event.type) {
    case "content_block_start":
      return toAcpNotifications(
        [event.content_block],
        "assistant",
        sessionId,
        toolUseCache,
        client,
        logger,
        { parentToolUseId: message.parent_tool_use_id },
      );
    case "content_block_delta":
      return toAcpNotifications(
        [event.delta],
        "assistant",
        sessionId,
        toolUseCache,
        client,
        logger,
        { parentToolUseId: message.parent_tool_use_id },
      );
    // No content
    case "message_start":
    case "message_delta":
    case "message_stop":
    case "content_block_stop":
      return [];

    default:
      unreachable(event, logger);
      return [];
  }
}

export function runAcp() {
  const input = nodeToWebWritable(process.stdout);
  const output = nodeToWebReadable(process.stdin);

  const stream = ndJsonStream(input, output);
  new AgentSideConnection((client) => new ClaudeAcpAgent(client), stream);
}
