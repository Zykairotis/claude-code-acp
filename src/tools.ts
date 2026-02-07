import {
  ContentBlock,
  PlanEntry,
  ToolCallContent,
  ToolCallLocation,
  ToolKind,
} from "@agentclientprotocol/sdk";
import { SYSTEM_REMINDER } from "./mcp-server.js";
import * as diff from "diff";
import {
  ImageBlockParam,
  TextBlockParam,
  ToolResultBlockParam,
  WebSearchResultBlock,
  WebSearchToolResultBlockParam,
  WebSearchToolResultError,
} from "@anthropic-ai/sdk/resources";
import {
  BetaBashCodeExecutionToolResultBlockParam,
  BetaBashCodeExecutionResultBlock,
  BetaBashCodeExecutionToolResultError,
  BetaCodeExecutionToolResultBlockParam,
  BetaCodeExecutionResultBlock,
  BetaCodeExecutionToolResultError,
  BetaRequestMCPToolResultBlockParam,
  BetaTextEditorCodeExecutionToolResultBlockParam,
  BetaTextEditorCodeExecutionViewResultBlock,
  BetaTextEditorCodeExecutionCreateResultBlock,
  BetaTextEditorCodeExecutionStrReplaceResultBlock,
  BetaTextEditorCodeExecutionToolResultError,
  BetaToolResultBlockParam,
  BetaToolSearchToolResultBlockParam,
  BetaToolReferenceBlock,
  BetaToolSearchToolSearchResultBlock,
  BetaToolSearchToolResultError,
  BetaWebFetchToolResultBlockParam,
  BetaWebFetchBlock,
  BetaWebFetchToolResultErrorBlock,
  BetaWebSearchToolResultBlockParam,
  BetaImageBlockParam,
} from "@anthropic-ai/sdk/resources/beta.mjs";

const acpUnqualifiedToolNames = {
  read: "Read",
  edit: "Edit",
  write: "Write",
  bash: "Bash",
  killShell: "KillShell",
  bashOutput: "BashOutput",
  rewindFiles: "RewindFiles",
  ls: "LS",
  glob: "Glob",
  grep: "Grep",
  task: "Task",
  agent: "Agent",
  taskStop: "TaskStop",
  taskOutput: "TaskOutput",
  listMcpResources: "ListMcpResources",
  readMcpResource: "ReadMcpResource",
  notebookRead: "NotebookRead",
  notebookEdit: "NotebookEdit",
  webSearch: "WebSearch",
  webFetch: "WebFetch",
  askUserQuestion: "AskUserQuestion",
  todoWrite: "TodoWrite",
  config: "Config",
  slashCommand: "SlashCommand",
  skill: "Skill",
};

export const ACP_TOOL_NAME_PREFIX = "mcp__acp__";
export const acpToolNames = {
  read: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.read,
  edit: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.edit,
  write: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.write,
  bash: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.bash,
  killShell: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.killShell,
  bashOutput: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.bashOutput,
  rewindFiles: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.rewindFiles,
  ls: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.ls,
  glob: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.glob,
  grep: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.grep,
  task: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.task,
  agent: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.agent,
  taskStop: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.taskStop,
  taskOutput: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.taskOutput,
  listMcpResources: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.listMcpResources,
  readMcpResource: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.readMcpResource,
  notebookRead: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.notebookRead,
  notebookEdit: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.notebookEdit,
  webSearch: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.webSearch,
  webFetch: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.webFetch,
  askUserQuestion: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.askUserQuestion,
  todoWrite: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.todoWrite,
  config: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.config,
  slashCommand: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.slashCommand,
  skill: ACP_TOOL_NAME_PREFIX + acpUnqualifiedToolNames.skill,
};

export const EDIT_TOOL_NAMES = [
  acpToolNames.edit,
  acpToolNames.write,
  acpToolNames.rewindFiles,
  acpToolNames.notebookEdit,
];

/**
 * Union of all possible content types that can appear in tool results from the Anthropic SDK.
 * These are transformed to valid ACP ContentBlock types by toValidAcpContent().
 */
type ToolResultContent =
  | TextBlockParam
  | ImageBlockParam
  | BetaImageBlockParam
  | BetaToolReferenceBlock
  | BetaToolSearchToolSearchResultBlock
  | BetaToolSearchToolResultError
  | WebSearchResultBlock
  | WebSearchToolResultError
  | BetaWebFetchBlock
  | BetaWebFetchToolResultErrorBlock
  | BetaCodeExecutionResultBlock
  | BetaCodeExecutionToolResultError
  | BetaBashCodeExecutionResultBlock
  | BetaBashCodeExecutionToolResultError
  | BetaTextEditorCodeExecutionViewResultBlock
  | BetaTextEditorCodeExecutionCreateResultBlock
  | BetaTextEditorCodeExecutionStrReplaceResultBlock
  | BetaTextEditorCodeExecutionToolResultError;
import { HookCallback } from "@anthropic-ai/claude-agent-sdk";
import { Logger } from "./acp-agent.js";
import { SettingsManager } from "./settings.js";

interface ToolInfo {
  title: string;
  kind: ToolKind;
  content: ToolCallContent[];
  locations?: ToolCallLocation[];
}

interface ToolUpdate {
  title?: string;
  content?: ToolCallContent[];
  locations?: ToolCallLocation[];
}

export function toolInfoFromToolUse(toolUse: any): ToolInfo {
  const name = toolUse.name;
  const input = toolUse.input;

  switch (name) {
    case "Task":
    case "Agent":
    case acpToolNames.task:
    case acpToolNames.agent:
      return {
        title: input?.description ? input.description : name,
        kind: "think",
        content:
          input && input.prompt
            ? [
                {
                  type: "content",
                  content: { type: "text", text: input.prompt },
                },
              ]
            : [],
      };

    case "NotebookRead":
    case acpToolNames.notebookRead:
      return {
        title: input?.notebook_path ? `Read Notebook ${input.notebook_path}` : "Read Notebook",
        kind: "read",
        content: [],
        locations: input?.notebook_path ? [{ path: input.notebook_path }] : [],
      };

    case "NotebookEdit":
    case acpToolNames.notebookEdit:
      return {
        title: input?.notebook_path ? `Edit Notebook ${input.notebook_path}` : "Edit Notebook",
        kind: "edit",
        content:
          input && input.new_source
            ? [
                {
                  type: "content",
                  content: { type: "text", text: input.new_source },
                },
              ]
            : [],
        locations: input?.notebook_path ? [{ path: input.notebook_path }] : [],
      };

    case "Bash":
    case acpToolNames.bash:
      return {
        title: input?.command ? "`" + input.command.replaceAll("`", "\\`") + "`" : "Terminal",
        kind: "execute",
        content:
          input && input.description
            ? [
                {
                  type: "content",
                  content: { type: "text", text: input.description },
                },
              ]
            : [],
      };

    case "BashOutput":
    case "TaskOutput":
    case acpToolNames.taskOutput:
    case acpToolNames.bashOutput:
      return {
        title: "Tail Logs",
        kind: "execute",
        content: [],
      };

    case "KillShell":
    case "TaskStop":
    case "KillBash":
    case acpToolNames.taskStop:
    case acpToolNames.killShell:
      return {
        title: "Kill Process",
        kind: "execute",
        content: [],
      };

    case acpToolNames.read: {
      const filePath = input.file_path ?? input.path;
      let limit = "";
      if (input.limit) {
        limit =
          " (" + ((input.offset ?? 0) + 1) + " - " + ((input.offset ?? 0) + input.limit) + ")";
      } else if (input.offset) {
        limit = " (from line " + (input.offset + 1) + ")";
      }
      return {
        title: "Read " + (filePath ?? "File") + limit,
        kind: "read",
        locations: filePath
          ? [
              {
                path: filePath,
                line: input.offset ?? 0,
              },
            ]
          : [],
        content: [],
      };
    }

    case "Read":
      return {
        title: "Read File",
        kind: "read",
        content: [],
        locations:
          (input.file_path ?? input.path)
            ? [
                {
                  path: input.file_path ?? input.path,
                  line: input.offset ?? 0,
                },
              ]
            : [],
      };

    case "LS":
    case acpToolNames.ls:
      return {
        title: `List the ${input?.path ? "`" + input.path + "`" : "current"} directory's contents`,
        kind: "search",
        content: [],
        locations: [],
      };

    case "ListMcpResources":
    case acpToolNames.listMcpResources:
      return {
        title: input?.server ? `List MCP resources from ${input.server}` : "List MCP resources",
        kind: "search",
        content: [],
      };

    case "ReadMcpResource":
    case acpToolNames.readMcpResource:
      return {
        title:
          input?.server && input?.uri
            ? `Read MCP resource ${input.uri} from ${input.server}`
            : "Read MCP resource",
        kind: "read",
        content: [],
      };

    case acpToolNames.edit:
    case "Edit": {
      const path = input?.file_path ?? input?.path;

      return {
        title: path ? `Edit \`${path}\`` : "Edit",
        kind: "edit",
        content:
          input && path
            ? [
                {
                  type: "diff",
                  path,
                  oldText: input.old_string ?? null,
                  newText: input.new_string ?? "",
                },
              ]
            : [],
        locations: path ? [{ path }] : undefined,
      };
    }

    case acpToolNames.write: {
      const filePath = input?.file_path ?? input?.path;
      let content: ToolCallContent[] = [];
      if (input && filePath) {
        content = [
          {
            type: "diff",
            path: filePath,
            oldText: null,
            newText: input.content,
          },
        ];
      } else if (input && input.content) {
        content = [
          {
            type: "content",
            content: { type: "text", text: input.content },
          },
        ];
      }
      return {
        title: filePath ? `Write ${filePath}` : "Write",
        kind: "edit",
        content,
        locations: filePath ? [{ path: filePath }] : [],
      };
    }

    case "Write": {
      const filePath = input?.file_path ?? input?.path;
      return {
        title: filePath ? `Write ${filePath}` : "Write",
        kind: "edit",
        content:
          input && filePath
            ? [
                {
                  type: "diff",
                  path: filePath,
                  oldText: null,
                  newText: input.content,
                },
              ]
            : [],
        locations: filePath ? [{ path: filePath }] : [],
      };
    }

    case acpToolNames.rewindFiles:
    case "RewindFiles":
      return {
        title:
          input?.user_message_id && input?.dry_run
            ? `Preview rewind to ${input.user_message_id}`
            : input?.user_message_id
              ? `Rewind files to ${input.user_message_id}`
              : "Rewind files",
        kind: "edit",
        content: [],
      };

    case "Glob":
    case acpToolNames.glob: {
      let label = "Find";
      if (input.path) {
        label += ` \`${input.path}\``;
      }
      if (input.pattern) {
        label += ` \`${input.pattern}\``;
      }
      return {
        title: label,
        kind: "search",
        content: [],
        locations: input.path ? [{ path: input.path }] : [],
      };
    }

    case "Grep":
    case acpToolNames.grep: {
      let label = "grep";

      if (input["-i"]) {
        label += " -i";
      }
      if (input["-n"]) {
        label += " -n";
      }

      if (input["-A"] !== undefined) {
        label += ` -A ${input["-A"]}`;
      }
      if (input["-B"] !== undefined) {
        label += ` -B ${input["-B"]}`;
      }
      if (input["-C"] !== undefined) {
        label += ` -C ${input["-C"]}`;
      }

      if (input.output_mode) {
        switch (input.output_mode) {
          case "FilesWithMatches":
            label += " -l";
            break;
          case "Count":
            label += " -c";
            break;
          case "Content":
          default:
            break;
        }
      }

      if (input.head_limit !== undefined) {
        label += ` | head -${input.head_limit}`;
      }

      if (input.glob) {
        label += ` --include="${input.glob}"`;
      }

      if (input.type) {
        label += ` --type=${input.type}`;
      }

      if (input.multiline) {
        label += " -P";
      }

      if (input.pattern) {
        label += ` "${input.pattern}"`;
      }

      if (input.path) {
        label += ` ${input.path}`;
      }

      return {
        title: label,
        kind: "search",
        content: [],
      };
    }

    case "WebFetch":
    case acpToolNames.webFetch:
      return {
        title: input?.url ? `Fetch ${input.url}` : "Fetch",
        kind: "fetch",
        content:
          input && input.prompt
            ? [
                {
                  type: "content",
                  content: { type: "text", text: input.prompt },
                },
              ]
            : [],
      };

    case "WebSearch":
    case acpToolNames.webSearch: {
      let label = `"${input.query}"`;

      if (input.allowed_domains && input.allowed_domains.length > 0) {
        label += ` (allowed: ${input.allowed_domains.join(", ")})`;
      }

      if (input.blocked_domains && input.blocked_domains.length > 0) {
        label += ` (blocked: ${input.blocked_domains.join(", ")})`;
      }

      return {
        title: label,
        kind: "fetch",
        content: [],
      };
    }

    case "TodoWrite":
    case acpToolNames.todoWrite:
      return {
        title: Array.isArray(input?.todos)
          ? `Update TODOs: ${input.todos.map((todo: any) => todo.content).join(", ")}`
          : "Update TODOs",
        kind: "think",
        content: [],
      };

    case "ExitPlanMode":
      return {
        title: "Ready to code?",
        kind: "switch_mode",
        content:
          input && input.plan
            ? [{ type: "content", content: { type: "text", text: input.plan } }]
            : [],
      };

    case "AskUserQuestion":
    case acpToolNames.askUserQuestion:
      return {
        title:
          Array.isArray(input?.questions) && input.questions.length > 0
            ? `Ask user: ${input.questions.map((q: any) => q.header || q.question).join(", ")}`
            : "Ask user question",
        kind: "think",
        content: [],
      };

    case "Config":
    case acpToolNames.config:
      return {
        title: "Update configuration",
        kind: "switch_mode",
        content: [],
      };

    case "SlashCommand":
    case acpToolNames.slashCommand:
      return {
        title: input?.command ? `Run ${input.command}` : "Run Slash Command",
        kind: "execute",
        content: [],
      };

    case "Skill":
    case acpToolNames.skill:
      return {
        title: input?.name ? `Run skill ${input.name}` : "Run Skill",
        kind: "execute",
        content: [],
      };

    case "Other": {
      let output;
      try {
        output = JSON.stringify(input, null, 2);
      } catch {
        output = typeof input === "string" ? input : "{}";
      }
      return {
        title: name || "Unknown Tool",
        kind: "other",
        content: [
          {
            type: "content",
            content: {
              type: "text",
              text: `\`\`\`json\n${output}\`\`\``,
            },
          },
        ],
      };
    }

    default:
      return {
        title: name || "Unknown Tool",
        kind: "other",
        content: [],
      };
  }
}

export function toolUpdateFromToolResult(
  toolResult:
    | ToolResultBlockParam
    | BetaToolResultBlockParam
    | BetaWebSearchToolResultBlockParam
    | BetaWebFetchToolResultBlockParam
    | WebSearchToolResultBlockParam
    | BetaCodeExecutionToolResultBlockParam
    | BetaBashCodeExecutionToolResultBlockParam
    | BetaTextEditorCodeExecutionToolResultBlockParam
    | BetaRequestMCPToolResultBlockParam
    | BetaToolSearchToolResultBlockParam,
  toolUse: any | undefined,
): ToolUpdate {
  if (
    "is_error" in toolResult &&
    toolResult.is_error &&
    toolResult.content &&
    toolResult.content.length > 0
  ) {
    // Only return errors
    return toAcpContentUpdate(toolResult.content, true);
  }

  switch (toolUse?.name) {
    case "Read":
    case acpToolNames.read:
      if (Array.isArray(toolResult.content) && toolResult.content.length > 0) {
        return {
          content: toolResult.content.map((content: any) => ({
            type: "content",
            content:
              content.type === "text"
                ? {
                    type: "text",
                    text: markdownEscape(content.text.replace(SYSTEM_REMINDER, "")),
                  }
                : content,
          })),
        };
      } else if (typeof toolResult.content === "string" && toolResult.content.length > 0) {
        return {
          content: [
            {
              type: "content",
              content: {
                type: "text",
                text: markdownEscape(toolResult.content.replace(SYSTEM_REMINDER, "")),
              },
            },
          ],
        };
      }
      return {};

    case acpToolNames.edit: {
      const content: ToolCallContent[] = [];
      const locations: ToolCallLocation[] = [];

      if (
        Array.isArray(toolResult.content) &&
        toolResult.content.length > 0 &&
        "text" in toolResult.content[0] &&
        typeof toolResult.content[0].text === "string"
      ) {
        const patches = diff.parsePatch(toolResult.content[0].text);
        for (const { oldFileName, newFileName, hunks } of patches) {
          for (const { lines, newStart } of hunks) {
            const oldText = [];
            const newText = [];
            for (const line of lines) {
              if (line.startsWith("-")) {
                oldText.push(line.slice(1));
              } else if (line.startsWith("+")) {
                newText.push(line.slice(1));
              } else {
                oldText.push(line.slice(1));
                newText.push(line.slice(1));
              }
            }
            if (oldText.length > 0 || newText.length > 0) {
              locations.push({ path: newFileName || oldFileName, line: newStart });
              content.push({
                type: "diff",
                path: newFileName || oldFileName,
                oldText: oldText.join("\n") || null,
                newText: newText.join("\n"),
              });
            }
          }
        }
      }

      const result: ToolUpdate = {};
      if (content.length > 0) {
        result.content = content;
      }
      if (locations.length > 0) {
        result.locations = locations;
      }
      return result;
    }

    case acpToolNames.bash:
    case "edit":
    case "Edit":
    case acpToolNames.write:
    case "Write": {
      return {};
    }

    case "ExitPlanMode": {
      return { title: "Exited Plan Mode" };
    }

    case "Task":
    case acpToolNames.task:
    case "NotebookEdit":
    case acpToolNames.notebookEdit:
    case "NotebookRead":
    case acpToolNames.notebookRead:
    case "TodoWrite":
    case acpToolNames.todoWrite:
    case "exit_plan_mode":
    case "Bash":
    case "BashOutput":
    case acpToolNames.bashOutput:
    case acpToolNames.taskOutput:
    case "KillBash":
    case acpToolNames.killShell:
    case acpToolNames.taskStop:
    case "LS":
    case acpToolNames.ls:
    case "Glob":
    case acpToolNames.glob:
    case "Grep":
    case acpToolNames.grep:
    case "WebFetch":
    case acpToolNames.webFetch:
    case "WebSearch":
    case acpToolNames.webSearch:
    case acpToolNames.config:
    case acpToolNames.listMcpResources:
    case acpToolNames.readMcpResource:
    case acpToolNames.agent:
    case acpToolNames.slashCommand:
    case acpToolNames.skill:
    case acpToolNames.askUserQuestion:
    case "AskUserQuestion":
    case "Other":
    default: {
      return toAcpContentUpdate(
        toolResult.content,
        "is_error" in toolResult ? toolResult.is_error : false,
      );
    }
  }
}

function toAcpContentUpdate(
  content: any,
  isError: boolean = false,
): { content?: ToolCallContent[] } {
  if (Array.isArray(content) && content.length > 0) {
    return {
      content: content.map((c: any) => ({
        type: "content" as const,
        content: toAcpContentBlock(c, isError),
      })),
    };
  } else if (typeof content === "object" && content !== null && "type" in content) {
    return {
      content: [
        {
          type: "content" as const,
          content: toAcpContentBlock(content, isError),
        },
      ],
    };
  } else if (typeof content === "string" && content.length > 0) {
    return {
      content: [
        {
          type: "content",
          content: {
            type: "text",
            text: isError ? `\`\`\`\n${content}\n\`\`\`` : content,
          },
        },
      ],
    };
  }
  return {};
}

function toAcpContentBlock(content: ToolResultContent, isError: boolean): ContentBlock {
  const wrapText = (text: string): ContentBlock => ({
    type: "text" as const,
    text: isError ? `\`\`\`\n${text}\n\`\`\`` : text,
  });

  switch (content.type) {
    case "text":
      return {
        type: "text" as const,
        text: isError ? `\`\`\`\n${content.text}\n\`\`\`` : content.text,
      };
    case "image":
      if (content.source.type === "base64") {
        return {
          type: "image" as const,
          data: content.source.data,
          mimeType: content.source.media_type,
        };
      }
      // URL and file-based images can't be converted to ACP format (requires data)
      return wrapText(
        content.source.type === "url"
          ? `[image: ${content.source.url}]`
          : "[image: file reference]",
      );

    case "tool_reference":
      return wrapText(`Tool: ${content.tool_name}`);
    case "tool_search_tool_search_result":
      return wrapText(
        `Tools found: ${content.tool_references.map((r) => r.tool_name).join(", ") || "none"}`,
      );
    case "tool_search_tool_result_error":
      return wrapText(
        `Error: ${content.error_code}${content.error_message ? ` - ${content.error_message}` : ""}`,
      );
    case "web_search_result":
      return wrapText(`${content.title} (${content.url})`);
    case "web_search_tool_result_error":
      return wrapText(`Error: ${content.error_code}`);
    case "web_fetch_result":
      return wrapText(`Fetched: ${content.url}`);
    case "web_fetch_tool_result_error":
      return wrapText(`Error: ${content.error_code}`);
    case "code_execution_result":
      return wrapText(`Output: ${content.stdout || content.stderr || ""}`);
    case "bash_code_execution_result":
      return wrapText(`Output: ${content.stdout || content.stderr || ""}`);
    case "code_execution_tool_result_error":
    case "bash_code_execution_tool_result_error":
      return wrapText(`Error: ${content.error_code}`);
    case "text_editor_code_execution_view_result":
      return wrapText(content.content);
    case "text_editor_code_execution_create_result":
      return wrapText(content.is_file_update ? "File updated" : "File created");
    case "text_editor_code_execution_str_replace_result":
      return wrapText(content.lines?.join("\n") || "");
    case "text_editor_code_execution_tool_result_error":
      return wrapText(
        `Error: ${content.error_code}${content.error_message ? ` - ${content.error_message}` : ""}`,
      );

    default:
      return wrapText(JSON.stringify(content));
  }
}

export type ClaudePlanEntry = {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
};

export function planEntries(input: { todos: ClaudePlanEntry[] }): PlanEntry[] {
  return input.todos.map((input) => ({
    content: input.content,
    status: input.status,
    priority: "medium",
  }));
}

export function markdownEscape(text: string): string {
  let escape = "```";
  for (const [m] of text.matchAll(/^```+/gm)) {
    while (m.length >= escape.length) {
      escape += "`";
    }
  }
  return escape + "\n" + text + (text.endsWith("\n") ? "" : "\n") + escape;
}

/* A global variable to store callbacks that should be executed when receiving hooks from Claude Code */
const toolUseCallbacks: {
  [toolUseId: string]: {
    onPostToolUseHook?: (
      toolUseID: string,
      toolInput: unknown,
      toolResponse: unknown,
    ) => Promise<void>;
  };
} = {};

/* Setup callbacks that will be called when receiving hooks from Claude Code */
export const registerHookCallback = (
  toolUseID: string,
  {
    onPostToolUseHook,
  }: {
    onPostToolUseHook?: (
      toolUseID: string,
      toolInput: unknown,
      toolResponse: unknown,
    ) => Promise<void>;
  },
) => {
  toolUseCallbacks[toolUseID] = {
    onPostToolUseHook,
  };
};

/* A callback for Claude Code that is called when receiving PostToolUse/TaskCompleted hooks */
export const createPostToolUseHook =
  (
    logger: Logger = console,
    options?: {
      onEnterPlanMode?: () => Promise<void>;
      onTaskCompleted?: (task: {
        task_id: string;
        task_subject: string;
        task_description?: string;
        teammate_name?: string;
        team_name?: string;
      }) => Promise<void>;
    },
  ): HookCallback =>
  async (
    input: any,
    toolUseID: string | undefined,
    _options: { signal: AbortSignal },
  ): Promise<{ continue: boolean }> => {
    if (input.hook_event_name === "TaskCompleted" && options?.onTaskCompleted) {
      if (
        typeof input.task_id === "string" &&
        input.task_id.length > 0 &&
        typeof input.task_subject === "string" &&
        input.task_subject.length > 0
      ) {
        await options.onTaskCompleted({
          task_id: input.task_id,
          task_subject: input.task_subject,
          task_description:
            typeof input.task_description === "string" ? input.task_description : undefined,
          teammate_name: typeof input.teammate_name === "string" ? input.teammate_name : undefined,
          team_name: typeof input.team_name === "string" ? input.team_name : undefined,
        });
      }
      return { continue: true };
    }

    if (input.hook_event_name === "PostToolUse") {
      // Handle EnterPlanMode tool - notify client of mode change after successful execution
      if (input.tool_name === "EnterPlanMode" && options?.onEnterPlanMode) {
        await options.onEnterPlanMode();
      }

      if (toolUseID) {
        const onPostToolUseHook = toolUseCallbacks[toolUseID]?.onPostToolUseHook;
        if (onPostToolUseHook) {
          await onPostToolUseHook(toolUseID, input.tool_input, input.tool_response);
          delete toolUseCallbacks[toolUseID]; // Cleanup after execution
        } else {
          logger.error(`No onPostToolUseHook found for tool use ID: ${toolUseID}`);
          delete toolUseCallbacks[toolUseID];
        }
      }
    }
    return { continue: true };
  };

/**
 * Creates a PreToolUse hook that checks permissions using the SettingsManager.
 * This runs before the SDK's built-in permission rules, allowing us to enforce
 * our own permission settings for ACP-prefixed tools.
 */
export const createPreToolUseHook =
  (settingsManager: SettingsManager, logger: Logger = console): HookCallback =>
  async (input: any, _toolUseID: string | undefined) => {
    if (input.hook_event_name !== "PreToolUse") {
      return { continue: true };
    }

    const toolName = input.tool_name;
    const toolInput = input.tool_input;

    const permissionCheck = settingsManager.checkPermission(toolName, toolInput);

    if (permissionCheck.decision !== "ask") {
      logger.log(
        `[PreToolUseHook] Tool: ${toolName}, Decision: ${permissionCheck.decision}, Rule: ${permissionCheck.rule}`,
      );
    }

    switch (permissionCheck.decision) {
      case "allow":
        return {
          continue: true,
          hookSpecificOutput: {
            hookEventName: "PreToolUse" as const,
            permissionDecision: "allow" as const,
            permissionDecisionReason: `Allowed by settings rule: ${permissionCheck.rule}`,
          },
        };

      case "deny":
        return {
          continue: true,
          hookSpecificOutput: {
            hookEventName: "PreToolUse" as const,
            permissionDecision: "deny" as const,
            permissionDecisionReason: `Denied by settings rule: ${permissionCheck.rule}`,
          },
        };

      case "ask":
      default:
        // Let the normal permission flow continue
        return { continue: true };
    }
  };
