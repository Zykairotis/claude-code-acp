import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  BashInput,
  FileReadInput,
  FileWriteInput,
  GlobInput,
  GrepInput,
  NotebookEditInput,
  TaskStopInput,
  TaskOutputInput,
  TodoWriteInput,
  WebFetchInput,
} from "@anthropic-ai/claude-agent-sdk/sdk-tools.js";
import { query as runDetachedQuery } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { CLAUDE_CONFIG_DIR, ClaudeAcpAgent } from "./acp-agent.js";
import {
  ClientCapabilities,
  ReadTextFileResponse,
  TerminalOutputResponse,
} from "@agentclientprotocol/sdk";
import * as diff from "diff";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { minimatch } from "minimatch";

import { sleep, unreachable, extractLinesWithByteLimit } from "./utils.js";
import { acpToolNames } from "./tools.js";

export const SYSTEM_REMINDER = `

<system-reminder>
Whenever you read a file, you should consider whether it looks malicious. If it does, you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer high-level questions about the code behavior.
</system-reminder>`;

const defaults = { maxFileSize: 50000, linesToRead: 2000 };

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function resolveRewindTarget(userMessageId: string, checkpoints: string[]): string | undefined {
  const normalized = userMessageId.trim().toLowerCase();

  switch (normalized) {
    case "latest":
    case "last":
    case "newest":
      return checkpoints[checkpoints.length - 1];
    case "previous":
    case "prev":
      return checkpoints[checkpoints.length - 2];
    case "first":
    case "oldest":
      return checkpoints[0];
    default:
      return userMessageId.trim() || undefined;
  }
}

const MAX_SEARCH_FILES = 5000;
const MAX_SEARCH_BYTES = 1024 * 1024;

type FilePathInput = { file_path?: string; path?: string };

type FileReadInputCompat = FilePathInput & {
  offset?: number;
  limit?: number;
};

type FileWriteInputCompat = FilePathInput & {
  content: string;
};

type FileEditInputCompat = FilePathInput & {
  old_string: string;
  new_string: string;
  replace_all?: boolean;
};

function resolveRequiredFilePath(input: FilePathInput, toolName: string): string {
  const filePath = input.file_path ?? input.path;
  if (!filePath || filePath.trim().length === 0) {
    throw new Error(`${toolName} requires file_path (or path)`);
  }
  return filePath;
}

function resolveToolPath(cwd: string, inputPath?: string): string {
  if (!inputPath || inputPath.trim().length === 0) {
    return cwd;
  }
  if (path.isAbsolute(inputPath)) {
    return path.normalize(inputPath);
  }
  return path.normalize(path.join(cwd, inputPath));
}

function isSkippableDirectory(dirPath: string): boolean {
  const base = path.basename(dirPath);
  return base === ".git" || base === "node_modules" || base === ".svn" || base === ".hg";
}

async function listFilesRecursive(root: string, limit: number = MAX_SEARCH_FILES): Promise<string[]> {
  const files: string[] = [];
  const queue: string[] = [root];

  while (queue.length > 0 && files.length < limit) {
    const dir = queue.shift()!;
    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }> = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (files.length >= limit) {
        break;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!isSkippableDirectory(fullPath)) {
          queue.push(fullPath);
        }
        continue;
      }
      if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function normalizeOutputMode(mode?: GrepInput["output_mode"]): "content" | "files_with_matches" | "count" {
  if (mode === "content" || mode === "count" || mode === "files_with_matches") {
    return mode;
  }
  return "files_with_matches";
}

const unqualifiedToolNames = {
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
  todoWrite: "TodoWrite",
  config: "Config",
  slashCommand: "SlashCommand",
  skill: "Skill",
};

export function createMcpServer(
  agent: ClaudeAcpAgent,
  sessionId: string,
  clientCapabilities: ClientCapabilities | undefined,
): McpServer {
  /**
   * This checks if a given path is related to internal agent persistence and if the agent should be allowed to read/write from here.
   * We let the agent do normal fs operations on these paths so that it can persist its state.
   * However, we block access to settings files for security reasons.
   */
  function internalPath(file_path: string) {
    return (
      file_path.startsWith(CLAUDE_CONFIG_DIR) &&
      !file_path.startsWith(path.join(CLAUDE_CONFIG_DIR, "settings.json")) &&
      !file_path.startsWith(path.join(CLAUDE_CONFIG_DIR, "session-env"))
    );
  }

  async function readTextFile(input: FileReadInput): Promise<ReadTextFileResponse> {
    if (internalPath(input.file_path)) {
      const content = await fs.readFile(input.file_path, "utf8");

      // eslint-disable-next-line eqeqeq
      if (input.offset != null || input.limit != null) {
        const lines = content.split("\n");

        // Apply offset and limit if provided
        const offset = input.offset ?? 1;
        const limit = input.limit ?? lines.length;

        // Extract the requested lines (offset is 1-based)
        const startIndex = Math.max(0, offset - 1);
        const endIndex = Math.min(lines.length, startIndex + limit);
        const selectedLines = lines.slice(startIndex, endIndex);

        return { content: selectedLines.join("\n") };
      } else {
        return { content };
      }
    }

    return agent.readTextFile({
      sessionId,
      path: input.file_path,
      line: input.offset,
      limit: input.limit,
    });
  }

  async function writeTextFile(input: FileWriteInput): Promise<void> {
    if (internalPath(input.file_path)) {
      await fs.writeFile(input.file_path, input.content, "utf8");
    } else {
      await agent.writeTextFile({
        sessionId,
        path: input.file_path,
        content: input.content,
      });
    }
  }

  // Create MCP server
  const server = new McpServer({ name: "acp", version: "1.0.0" }, { capabilities: { tools: {} } });

  if (clientCapabilities?.fs?.readTextFile) {
    server.registerTool(
      unqualifiedToolNames.read,
      {
        title: unqualifiedToolNames.read,
        description: `Reads the content of the given file in the project.

In sessions with ${acpToolNames.read} always use it instead of Read as it contains the most up-to-date contents.

Reads a file from the local filesystem. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to ${defaults.linesToRead} lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters
- Any files larger than ${defaults.maxFileSize} bytes will be truncated
- This tool allows Claude Code to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as Claude Code is a multimodal LLM.
- This tool can only read files, not directories. To read a directory, use an ls command via the ${acpToolNames.bash} tool.
- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful.`,
        inputSchema: {
          file_path: z
            .string()
            .optional()
            .describe("The absolute path to the file to read"),
          path: z
            .string()
            .optional()
            .describe("Alias for file_path. The absolute path to the file to read"),
          offset: z
            .number()
            .optional()
            .default(1)
            .describe(
              "The line number to start reading from. Only provide if the file is too large to read at once",
            ),
          limit: z
            .number()
            .optional()
            .default(defaults.linesToRead)
            .describe(
              `The number of lines to read. Only provide if the file is too large to read at once.`,
            ),
        },
        annotations: {
          title: "Read file",
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
          idempotentHint: false,
        },
      },
      async (input: FileReadInputCompat) => {
        try {
          const session = agent.sessions[sessionId];
          if (!session) {
            return {
              content: [
                {
                  type: "text",
                  text: "The user has left the building",
                },
              ],
            };
          }

          const normalizedInput: FileReadInput = {
            file_path: resolveRequiredFilePath(input, unqualifiedToolNames.read),
            offset: input.offset,
            limit: input.limit,
          };

          const readResponse = await readTextFile(normalizedInput);

          if (typeof readResponse?.content !== "string") {
            throw new Error(`No file contents for ${normalizedInput.file_path}.`);
          }

          // Extract lines with byte limit enforcement
          const result = extractLinesWithByteLimit(readResponse.content, defaults.maxFileSize);

          // Construct informative message about what was read
          let readInfo = "";
          if ((normalizedInput.offset && normalizedInput.offset > 1) || result.wasLimited) {
            readInfo = "\n\n<file-read-info>";

            if (result.wasLimited) {
              readInfo += `Read ${result.linesRead} lines (hit 50KB limit). `;
            } else if (normalizedInput.offset && normalizedInput.offset > 1) {
              readInfo += `Read lines ${normalizedInput.offset}-${normalizedInput.offset + result.linesRead}.`;
            }

            if (result.wasLimited) {
              readInfo += `Continue with offset=${result.linesRead}.`;
            }

            readInfo += "</file-read-info>";
          }

          return {
            content: [
              {
                type: "text",
                text: result.content + readInfo + SYSTEM_REMINDER,
              },
            ],
          };
        } catch (error) {
          const session = agent.sessions[sessionId];
          const cwd = session?.settingsManager.getCwd();
          let message = formatErrorMessage(error);
          if (cwd && message.includes("Path does not exist")) {
            message += ` Hint: use ${acpToolNames.ls} or ${acpToolNames.glob} under ${cwd}.`;
          }
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Reading file failed: " + message,
              },
            ],
          };
        }
      },
    );
  }

  if (clientCapabilities?.fs?.writeTextFile) {
    server.registerTool(
      unqualifiedToolNames.write,
      {
        title: unqualifiedToolNames.write,
        description: `Writes a file to the local filesystem..

In sessions with ${acpToolNames.write} always use it instead of Write as it will
allow the user to conveniently review changes.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.
- If this is an existing file, you MUST use the ${acpToolNames.read} tool first to read the file's contents. This tool will fail if you did not read the file first.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`,
        inputSchema: {
          file_path: z
            .string()
            .optional()
            .describe("The absolute path to the file to write (must be absolute, not relative)"),
          path: z
            .string()
            .optional()
            .describe("The absolute path to the file to write (must be absolute, not relative)"),
          content: z.string().describe("The content to write to the file"),
        },
        annotations: {
          title: "Write file",
          readOnlyHint: false,
          destructiveHint: false,
          openWorldHint: false,
          idempotentHint: false,
        },
      },
      async (input: FileWriteInputCompat) => {
        try {
          const session = agent.sessions[sessionId];
          if (!session) {
            return {
              content: [
                {
                  type: "text",
                  text: "The user has left the building",
                },
              ],
            };
          }
          const normalizedInput: FileWriteInput = {
            file_path: resolveRequiredFilePath(input, unqualifiedToolNames.write),
            content: input.content,
          };
          await writeTextFile(normalizedInput);

          return {
            content: [
              {
                type: "text",
                text: `The file ${normalizedInput.file_path} has been updated successfully.`,
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Writing file failed: " + formatErrorMessage(error),
              },
            ],
          };
        }
      },
    );

    server.registerTool(
      unqualifiedToolNames.edit,
      {
        title: unqualifiedToolNames.edit,
        description: `Performs exact string replacements in files.

In sessions with ${acpToolNames.edit} always use it instead of Edit as it will
allow the user to conveniently review changes.

Usage:
- You must use your \`${acpToolNames.read}\` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if \`old_string\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`replace_all\` to change every instance of \`old_string\`.
- Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.`,
        inputSchema: {
          file_path: z.string().optional().describe("The absolute path to the file to modify"),
          path: z
            .string()
            .optional()
            .describe("Alias for file_path. The absolute path to the file to modify"),
          old_string: z.string().describe("The text to replace"),
          new_string: z
            .string()
            .describe("The text to replace it with (must be different from old_string)"),
          replace_all: z
            .boolean()
            .default(false)
            .optional()
            .describe("Replace all occurrences of old_string (default false)"),
        },
        annotations: {
          title: "Edit file",
          readOnlyHint: false,
          destructiveHint: false,
          openWorldHint: false,
          idempotentHint: false,
        },
      },
      async (input: FileEditInputCompat) => {
        try {
          const session = agent.sessions[sessionId];
          if (!session) {
            return {
              content: [
                {
                  type: "text",
                  text: "The user has left the building",
                },
              ],
            };
          }
          const filePath = resolveRequiredFilePath(input, unqualifiedToolNames.edit);

          const readResponse = await readTextFile({
            file_path: filePath,
          });

          if (typeof readResponse?.content !== "string") {
            throw new Error(`No file contents for ${filePath}.`);
          }

          const { newContent } = replaceAndCalculateLocation(readResponse.content, [
            {
              oldText: input.old_string,
              newText: input.new_string,
              replaceAll: input.replace_all,
            },
          ]);

          const patch = diff.createPatch(filePath, readResponse.content, newContent);

          await writeTextFile({ file_path: filePath, content: newContent });

          return {
            content: [
              {
                type: "text",
                text: patch,
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Editing file failed: " + formatErrorMessage(error),
              },
            ],
          };
        }
      },
    );
  }

  server.registerTool(
    unqualifiedToolNames.ls,
    {
      title: unqualifiedToolNames.ls,
      description: "List directory contents.",
      inputSchema: {
        path: z
          .string()
          .optional()
          .describe("Absolute or relative directory path. Defaults to current working directory."),
      },
      annotations: {
        title: "List directory",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    async (input: { path?: string }) => {
      try {
        const session = agent.sessions[sessionId];
        if (!session) {
          throw new Error("Session not found");
        }

        const cwd = session.settingsManager.getCwd();
        const targetPath = resolveToolPath(cwd, input.path);
        const stat = await fs.stat(targetPath);
        if (!stat.isDirectory()) {
          throw new Error(`${targetPath} is not a directory`);
        }

        const entries = await fs.readdir(targetPath, { withFileTypes: true });
        const formatted = entries
          .map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name))
          .sort((a, b) => a.localeCompare(b));

        return {
          content: [
            {
              type: "text",
              text: [`Directory: ${targetPath}`, ...formatted].join("\n"),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Listing directory failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.glob,
    {
      title: unqualifiedToolNames.glob,
      description: "Find files by glob pattern.",
      inputSchema: {
        pattern: z.string().describe("Glob pattern to match."),
        path: z.string().optional().describe("Search root path. Defaults to current directory."),
      },
      annotations: {
        title: "Glob search",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    async (input: GlobInput) => {
      try {
        const session = agent.sessions[sessionId];
        if (!session) {
          throw new Error("Session not found");
        }

        const cwd = session.settingsManager.getCwd();
        const root = resolveToolPath(cwd, input.path);
        const stat = await fs.stat(root);
        if (!stat.isDirectory()) {
          throw new Error(`${root} is not a directory`);
        }

        const files = await listFilesRecursive(root);
        const matches = files.filter((file) => {
          const relative = path.relative(root, file).replace(/\\/g, "/");
          const absolute = file.replace(/\\/g, "/");
          return (
            minimatch(relative, input.pattern, { dot: true, matchBase: true }) ||
            minimatch(absolute, input.pattern, { dot: true, matchBase: true })
          );
        });

        return {
          content: [
            {
              type: "text",
              text: matches.length > 0 ? matches.join("\n") : "No files matched.",
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Glob search failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.grep,
    {
      title: unqualifiedToolNames.grep,
      description: "Search file contents using a regular expression.",
      inputSchema: {
        pattern: z.string().describe("Regular expression pattern."),
        path: z.string().optional().describe("Root directory or file path."),
        glob: z.string().optional().describe("Optional file glob filter."),
        output_mode: z
          .enum(["content", "files_with_matches", "count"])
          .optional()
          .describe("Result output mode."),
        "-n": z.boolean().optional().describe("Include line numbers in content mode."),
        "-i": z.boolean().optional().describe("Case-insensitive matching."),
        head_limit: z.number().optional().describe("Maximum number of output entries."),
        offset: z.number().optional().describe("Skip first N output entries."),
        multiline: z.boolean().optional().describe("Enable multiline regex matching."),
      },
      annotations: {
        title: "Content search",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    async (input: GrepInput) => {
      try {
        const session = agent.sessions[sessionId];
        if (!session) {
          throw new Error("Session not found");
        }

        const cwd = session.settingsManager.getCwd();
        const target = resolveToolPath(cwd, input.path);
        const stat = await fs.stat(target);
        const rootDir = stat.isDirectory() ? target : path.dirname(target);
        const candidates = stat.isDirectory() ? await listFilesRecursive(target) : [target];
        const mode = normalizeOutputMode(input.output_mode);

        const flags = `${input["-i"] ? "i" : ""}${input.multiline ? "ms" : "m"}`;
        let regex: RegExp;
        try {
          regex = new RegExp(input.pattern, flags);
        } catch (error) {
          throw new Error(`Invalid regex: ${formatErrorMessage(error)}`);
        }

        const withLineNumbers = input["-n"] ?? true;
        const contentLines: string[] = [];
        const fileHits: string[] = [];
        const countHits: string[] = [];

        for (const filePath of candidates) {
          const relative = path.relative(rootDir, filePath).replace(/\\/g, "/");
          if (input.glob && !minimatch(relative, input.glob, { dot: true, matchBase: true })) {
            continue;
          }

          let fileContent: string;
          try {
            const fileStat = await fs.stat(filePath);
            if (fileStat.size > MAX_SEARCH_BYTES) {
              continue;
            }
            fileContent = await fs.readFile(filePath, "utf8");
          } catch {
            continue;
          }

          if (mode === "content") {
            const lines = fileContent.split("\n");
            let matched = false;
            for (let idx = 0; idx < lines.length; idx += 1) {
              if (!regex.test(lines[idx])) {
                continue;
              }
              matched = true;
              contentLines.push(
                withLineNumbers
                  ? `${filePath}:${idx + 1}:${lines[idx]}`
                  : `${filePath}:${lines[idx]}`,
              );
            }
            if (!matched) {
              continue;
            }
          } else if (mode === "count") {
            const lines = fileContent.split("\n");
            let count = 0;
            for (const line of lines) {
              if (regex.test(line)) {
                count += 1;
              }
            }
            if (count > 0) {
              countHits.push(`${filePath}:${count}`);
            }
          } else {
            if (regex.test(fileContent)) {
              fileHits.push(filePath);
            }
          }
        }

        const output =
          mode === "content" ? contentLines : mode === "count" ? countHits : fileHits;
        const offset = Math.max(0, input.offset ?? 0);
        const headLimit =
          input.head_limit !== undefined && input.head_limit > 0 ? input.head_limit : output.length;
        const sliced = output.slice(offset, offset + headLimit);

        return {
          content: [
            {
              type: "text",
              text: sliced.length > 0 ? sliced.join("\n") : "No matches found.",
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Grep failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.notebookRead,
    {
      title: unqualifiedToolNames.notebookRead,
      description: "Read Jupyter notebook cells.",
      inputSchema: {
        notebook_path: z.string().describe("Absolute or relative path to notebook (.ipynb)."),
        cell_id: z.string().optional().describe("Optional specific cell id."),
      },
      annotations: {
        title: "Read notebook",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    async (input: { notebook_path: string; cell_id?: string }) => {
      try {
        const session = agent.sessions[sessionId];
        if (!session) {
          throw new Error("Session not found");
        }
        const notebookPath = resolveToolPath(session.settingsManager.getCwd(), input.notebook_path);
        const raw = await fs.readFile(notebookPath, "utf8");
        const notebook = JSON.parse(raw) as { cells?: any[] };
        const cells = Array.isArray(notebook.cells) ? notebook.cells : [];

        const selectedCells = input.cell_id
          ? cells.filter((cell) => cell && typeof cell.id === "string" && cell.id === input.cell_id)
          : cells;
        if (selectedCells.length === 0) {
          return {
            content: [{ type: "text", text: input.cell_id ? "Cell not found." : "Notebook has no cells." }],
          };
        }

        const output = selectedCells
          .slice(0, 200)
          .map((cell, index) => {
            const source = Array.isArray(cell.source)
              ? cell.source.join("")
              : typeof cell.source === "string"
                ? cell.source
                : "";
            const id = typeof cell.id === "string" ? cell.id : `cell-${index + 1}`;
            const type = typeof cell.cell_type === "string" ? cell.cell_type : "unknown";
            return `# ${id} (${type})\n${source}`;
          })
          .join("\n\n");

        return {
          content: [{ type: "text", text: output }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Notebook read failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.notebookEdit,
    {
      title: unqualifiedToolNames.notebookEdit,
      description: "Edit a Jupyter notebook cell.",
      inputSchema: {
        notebook_path: z.string().describe("Absolute or relative path to notebook (.ipynb)."),
        cell_id: z.string().optional().describe("Cell id target. Required for replace/delete."),
        new_source: z.string().describe("New source content for replace/insert."),
        cell_type: z.enum(["code", "markdown"]).optional().describe("Cell type for insert."),
        edit_mode: z
          .enum(["replace", "insert", "delete"])
          .optional()
          .default("replace")
          .describe("Edit mode."),
      },
      annotations: {
        title: "Edit notebook",
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
    },
    async (input: NotebookEditInput) => {
      try {
        const session = agent.sessions[sessionId];
        if (!session) {
          throw new Error("Session not found");
        }
        const notebookPath = resolveToolPath(session.settingsManager.getCwd(), input.notebook_path);
        const raw = await fs.readFile(notebookPath, "utf8");
        const notebook = JSON.parse(raw) as { cells?: any[] };
        const cells = Array.isArray(notebook.cells) ? notebook.cells : [];
        const editMode = input.edit_mode ?? "replace";
        const cellIndex =
          input.cell_id !== undefined ? cells.findIndex((cell) => cell?.id === input.cell_id) : -1;

        if ((editMode === "replace" || editMode === "delete") && cellIndex < 0) {
          throw new Error("cell_id is required and must reference an existing cell");
        }

        if (editMode === "delete") {
          cells.splice(cellIndex, 1);
        } else if (editMode === "replace") {
          const existing = cells[cellIndex];
          cells[cellIndex] = {
            ...existing,
            source: [input.new_source],
            cell_type: input.cell_type ?? existing?.cell_type ?? "code",
          };
        } else {
          const insertAfter =
            input.cell_id !== undefined ? cells.findIndex((cell) => cell?.id === input.cell_id) : -1;
          const newCell = {
            id: `acp-${Date.now().toString(36)}`,
            cell_type: input.cell_type ?? "code",
            metadata: {},
            source: [input.new_source],
            outputs: [],
            execution_count: null,
          };
          if (insertAfter >= 0) {
            cells.splice(insertAfter + 1, 0, newCell);
          } else {
            cells.unshift(newCell);
          }
        }

        notebook.cells = cells;
        await fs.writeFile(notebookPath, JSON.stringify(notebook, null, 2) + "\n", "utf8");

        return {
          content: [{ type: "text", text: `Notebook updated: ${notebookPath}` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Notebook edit failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.webFetch,
    {
      title: unqualifiedToolNames.webFetch,
      description: "Fetch web content from a URL.",
      inputSchema: {
        url: z.string().url().describe("URL to fetch."),
        prompt: z.string().describe("Prompt context for fetched content."),
      },
      annotations: {
        title: "Fetch URL",
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
        idempotentHint: true,
      },
    },
    async (input: WebFetchInput) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20_000);
        const response = await fetch(input.url, {
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);

        const body = await response.text();
        const preview = body.slice(0, 20_000);
        const promptLine = input.prompt ? `Prompt: ${input.prompt}\n\n` : "";
        return {
          content: [
            {
              type: "text",
              text:
                `${promptLine}URL: ${input.url}\nStatus: ${response.status} ${response.statusText}\n\n` +
                preview +
                (body.length > preview.length ? "\n\n[truncated]" : ""),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Web fetch failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.todoWrite,
    {
      title: unqualifiedToolNames.todoWrite,
      description: "Update TODO plan entries.",
      inputSchema: {
        todos: z.array(
          z.object({
            content: z.string(),
            status: z.enum(["pending", "in_progress", "completed"]),
            activeForm: z.string(),
          }),
        ),
      },
      annotations: {
        title: "Update TODOs",
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
    },
    async (input: TodoWriteInput) => {
      try {
        const summary = input.todos
          .map((todo, index) => `${index + 1}. [${todo.status}] ${todo.content}`)
          .join("\n");
        return {
          content: [{ type: "text", text: summary.length > 0 ? summary : "No TODO entries provided." }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "TodoWrite failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.rewindFiles,
    {
      title: unqualifiedToolNames.rewindFiles,
      description: `Rewinds tracked files to the state at a previous user message.

In sessions with ${acpToolNames.rewindFiles} always use it instead of RewindFiles.

Usage:
- Use this to restore files to the exact checkpoint captured at a specific user message.
- \`user_message_id\` can be a UUID or one of: \`latest\`, \`previous\`, \`first\`.
- \`dry_run=true\` previews whether rewind is possible and what would change.
- \`dry_run=false\` applies the rewind to workspace files.
- Requires Claude Code file checkpointing to be enabled for the session.`,
      inputSchema: {
        user_message_id: z
          .string()
          .describe(
            "Checkpoint target: a user message UUID or alias (latest | previous | first)",
          ),
        dry_run: z
          .boolean()
          .optional()
          .default(false)
          .describe("If true, only preview rewind feasibility without changing files"),
      },
      annotations: {
        title: "Rewind files",
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
    },
    async (input) => {
      try {
        const session = agent.sessions[sessionId];
        if (!session) {
          return {
            content: [
              {
                type: "text",
                text: "The user has left the building",
              },
            ],
          };
        }

        const requestedTarget = input.user_message_id.trim();
        const resolvedTarget = resolveRewindTarget(
          requestedTarget,
          session.userMessageCheckpoints,
        );

        if (!resolvedTarget) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text:
                  "No user-message checkpoints are available yet. Send at least one user prompt before rewinding.",
              },
            ],
          };
        }

        const result = await session.query.rewindFiles(resolvedTarget, {
          dryRun: input.dry_run,
        });

        if (!result.canRewind) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text:
                  result.error ??
                  `Cannot rewind files to message ${resolvedTarget}. File checkpointing may be disabled.`,
              },
            ],
          };
        }

        const mode = input.dry_run ? "Previewed rewind" : "Rewound files";
        const fileCount = result.filesChanged?.length ?? 0;
        const insertionCount = result.insertions ?? 0;
        const deletionCount = result.deletions ?? 0;

        const resolvedLine =
          resolvedTarget !== requestedTarget
            ? `Resolved ${requestedTarget} to ${resolvedTarget}.`
            : null;
        const details = [
          `${mode} to ${resolvedTarget}.`,
          resolvedLine,
          `Files changed: ${fileCount}.`,
          `Insertions: ${insertionCount}, deletions: ${deletionCount}.`,
          fileCount > 0 ? `Files: ${result.filesChanged!.join(", ")}` : null,
        ]
          .filter((line): line is string => !!line)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: details,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Rewinding files failed: " + formatErrorMessage(error),
            },
          ],
        };
      }
    },
  );

  type AgentTaskInput = {
    description: string;
    prompt: string;
    subagent_type: string;
    model?: "sonnet" | "opus" | "haiku";
    resume?: string;
    run_in_background?: boolean;
    max_turns?: number;
    name?: string;
    team_name?: string;
    mode?: "acceptEdits" | "bypassPermissions" | "default" | "delegate" | "dontAsk" | "plan";
  };

  const textContent = (text: string) => [{ type: "text" as const, text }];

  const detachedPrompt = async (prompt: string, options: Record<string, unknown> = {}) => {
    const session = agent.sessions[sessionId];
    if (!session) {
      throw new Error("Session not found");
    }

    const detached = runDetachedQuery({
      prompt,
      options: {
        cwd: session.settingsManager.getCwd(),
        permissionMode: session.permissionMode,
        ...options,
      },
    });

    for await (const message of detached) {
      if (message.type !== "result") {
        continue;
      }

      const resultText =
        "result" in message && typeof message.result === "string" && message.result.length > 0
          ? message.result
          : message.subtype;
      if (message.is_error) {
        throw new Error(resultText);
      }

      return resultText || "Completed.";
    }

    throw new Error("Detached query completed without a result.");
  };

  const runTaskLikeWrapper = async (
    toolName: string,
    input: AgentTaskInput,
  ): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> => {
    try {
      if (input.run_in_background) {
        return {
          isError: true,
          content: textContent(
            `${toolName} wrapper currently supports foreground execution only. ` +
              `Set run_in_background=false or use native ${toolName}.`,
          ),
        };
      }

      const options: Record<string, unknown> = {};
      if (input.subagent_type?.trim()) {
        options.agent = input.subagent_type.trim();
      }
      if (input.model) {
        options.model = input.model;
      }
      if (typeof input.resume === "string" && input.resume.trim().length > 0) {
        options.resume = input.resume.trim();
      }
      if (typeof input.max_turns === "number" && Number.isFinite(input.max_turns)) {
        options.maxTurns = input.max_turns;
      }
      if (input.mode) {
        options.permissionMode = input.mode;
      }

      const result = await detachedPrompt(input.prompt, options);
      return {
        content: textContent(`${toolName} completed.\n${result}`),
      };
    } catch (error) {
      return {
        isError: true,
        content: textContent(`${toolName} failed: ${formatErrorMessage(error)}`),
      };
    }
  };

  const resolveSearchUrl = (rawHref: string): string | null => {
    let href = rawHref.trim();
    if (!href) {
      return null;
    }
    if (href.startsWith("//")) {
      href = "https:" + href;
    }
    try {
      const parsed = new URL(href);
      const redirect = parsed.searchParams.get("uddg");
      if (redirect && redirect.trim().length > 0) {
        return decodeURIComponent(redirect);
      }
      if (!parsed.protocol.startsWith("http")) {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const normalizeDomain = (urlString: string): string | null => {
    try {
      return new URL(urlString).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return null;
    }
  };

  const matchesDomainFilter = (
    urlString: string,
    allowedDomains: string[],
    blockedDomains: string[],
  ): boolean => {
    const hostname = normalizeDomain(urlString);
    if (!hostname) {
      return false;
    }
    if (
      blockedDomains.some((domain) => hostname === domain || hostname.endsWith("." + domain))
    ) {
      return false;
    }
    if (allowedDomains.length === 0) {
      return true;
    }
    return allowedDomains.some((domain) => hostname === domain || hostname.endsWith("." + domain));
  };

  server.registerTool(
    unqualifiedToolNames.task,
    {
      title: unqualifiedToolNames.task,
      description: "ACP compatibility wrapper for subagent task execution.",
      inputSchema: {
        description: z.string(),
        prompt: z.string(),
        subagent_type: z.string(),
        model: z.enum(["sonnet", "opus", "haiku"]).optional(),
        resume: z.string().optional(),
        run_in_background: z.boolean().optional(),
        max_turns: z.number().optional(),
        name: z.string().optional(),
        team_name: z.string().optional(),
        mode: z
          .enum(["acceptEdits", "bypassPermissions", "default", "delegate", "dontAsk", "plan"])
          .optional(),
      },
    },
    async (input: AgentTaskInput) => runTaskLikeWrapper("Task", input),
  );

  server.registerTool(
    unqualifiedToolNames.agent,
    {
      title: unqualifiedToolNames.agent,
      description: "ACP compatibility wrapper for subagent execution.",
      inputSchema: {
        description: z.string(),
        prompt: z.string(),
        subagent_type: z.string(),
        model: z.enum(["sonnet", "opus", "haiku"]).optional(),
        resume: z.string().optional(),
        run_in_background: z.boolean().optional(),
        max_turns: z.number().optional(),
        name: z.string().optional(),
        team_name: z.string().optional(),
        mode: z
          .enum(["acceptEdits", "bypassPermissions", "default", "delegate", "dontAsk", "plan"])
          .optional(),
      },
    },
    async (input: AgentTaskInput) => runTaskLikeWrapper("Agent", input),
  );

  server.registerTool(
    unqualifiedToolNames.listMcpResources,
    {
      title: unqualifiedToolNames.listMcpResources,
      description:
        "List MCP server connectivity status. Resource-level enumeration is not currently exposed in this SDK adapter.",
      inputSchema: { server: z.string().optional() },
    },
    async (input: { server?: string }) => {
      try {
        const session = agent.sessions[sessionId];
        if (!session) {
          throw new Error("Session not found");
        }
        const statuses = await session.query.mcpServerStatus();
        const filtered = input.server
          ? statuses.filter((status) => status.name === input.server)
          : statuses;

        if (filtered.length === 0) {
          return {
            content: [{ type: "text", text: "No matching MCP servers found." }],
          };
        }

        const lines = filtered.map((status) => {
          const error = status.error ? `, error=${status.error}` : "";
          return `${status.name}: ${status.status}${error}`;
        });

        return {
          content: [
            {
              type: "text",
              text:
                "MCP resource listing is not available through the SDK control API in this adapter.\n" +
                `Server status:\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Listing MCP resources failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.readMcpResource,
    {
      title: unqualifiedToolNames.readMcpResource,
      description:
        "Read an MCP resource. This wrapper validates server availability but cannot fetch resource content via current SDK APIs.",
      inputSchema: { server: z.string(), uri: z.string() },
    },
    async (input: { server: string; uri: string }) => {
      try {
        const session = agent.sessions[sessionId];
        if (!session) {
          throw new Error("Session not found");
        }
        const statuses = await session.query.mcpServerStatus();
        const serverStatus = statuses.find((status) => status.name === input.server);
        if (!serverStatus) {
          return {
            isError: true,
            content: [{ type: "text", text: `Unknown MCP server '${input.server}'.` }],
          };
        }
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                `ReadMcpResource wrapper cannot fetch URI '${input.uri}' because resource read control ` +
                "requests are not exposed by this SDK adapter. Use native ReadMcpResource when available.",
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Reading MCP resource failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.webSearch,
    {
      title: unqualifiedToolNames.webSearch,
      description:
        "Search the web using a DuckDuckGo HTML fallback for ACP compatibility when native WebSearch is unavailable.",
      inputSchema: {
        query: z.string(),
        allowed_domains: z.array(z.string()).optional(),
        blocked_domains: z.array(z.string()).optional(),
      },
    },
    async (input: { query: string; allowed_domains?: string[]; blocked_domains?: string[] }) => {
      try {
        const response = await fetch(
          `https://duckduckgo.com/html/?q=${encodeURIComponent(input.query)}`,
          {
            redirect: "follow",
            headers: {
              "user-agent":
                "Mozilla/5.0 (compatible; claude-code-acp/1.0; +https://github.com/zed-industries/claude-code-acp)",
            },
          },
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        const allowedDomains = (input.allowed_domains ?? [])
          .map((domain) => domain.trim().toLowerCase().replace(/^www\./, ""))
          .filter((domain) => domain.length > 0);
        const blockedDomains = (input.blocked_domains ?? [])
          .map((domain) => domain.trim().toLowerCase().replace(/^www\./, ""))
          .filter((domain) => domain.length > 0);

        const results: Array<{ title: string; url: string }> = [];
        const seen = new Set<string>();
        const anchorRegex =
          /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gims;
        for (const match of html.matchAll(anchorRegex)) {
          const resolvedUrl = resolveSearchUrl(match[1]);
          if (!resolvedUrl || seen.has(resolvedUrl)) {
            continue;
          }
          if (!matchesDomainFilter(resolvedUrl, allowedDomains, blockedDomains)) {
            continue;
          }
          const title = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
          results.push({ title: title || resolvedUrl, url: resolvedUrl });
          seen.add(resolvedUrl);
          if (results.length >= 10) {
            break;
          }
        }

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No search results matched the requested domain filters." }],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: results
                .map((result, index) => `${index + 1}. ${result.title}\n${result.url}`)
                .join("\n\n"),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Web search failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.config,
    {
      title: unqualifiedToolNames.config,
      description: "Read or mutate supported runtime session configuration values.",
      inputSchema: {
        setting: z.string(),
        value: z.union([z.string(), z.number(), z.boolean()]).optional(),
      },
    },
    async (input: { setting: string; value?: string | number | boolean }) => {
      try {
        const session = agent.sessions[sessionId];
        if (!session) {
          throw new Error("Session not found");
        }

        const normalized = input.setting.trim().toLowerCase();
        const value = input.value;

        if (value === undefined) {
          switch (normalized) {
            case "mode":
            case "permission_mode":
            case "permissions.defaultmode":
              return { content: [{ type: "text", text: session.sessionConfig.modeId }] };
            case "model":
              return { content: [{ type: "text", text: session.sessionConfig.modelId }] };
            case "max_thinking_tokens":
              return {
                content: [
                  {
                    type: "text",
                    text:
                      session.sessionConfig.maxThinkingTokens === null
                        ? "adaptive"
                        : String(session.sessionConfig.maxThinkingTokens),
                  },
                ],
              };
            case "output_style":
              return { content: [{ type: "text", text: session.sessionConfig.outputStyleId }] };
            default:
              throw new Error(
                `Unsupported setting '${input.setting}'. Supported settings: mode, model, max_thinking_tokens, output_style.`,
              );
          }
        }

        switch (normalized) {
          case "mode":
          case "permission_mode":
          case "permissions.defaultmode": {
            if (
              typeof value !== "string" ||
              !["acceptEdits", "bypassPermissions", "default", "delegate", "dontAsk", "plan"].includes(
                value,
              )
            ) {
              throw new Error("mode must be one of acceptEdits, bypassPermissions, default, delegate, dontAsk, plan");
            }
            await session.query.setPermissionMode(value as any);
            session.permissionMode = value as any;
            session.sessionConfig.modeId = value as any;
            break;
          }
          case "model": {
            if (typeof value !== "string" || value.trim().length === 0) {
              throw new Error("model must be a non-empty string");
            }
            await session.query.setModel(value.trim());
            session.sessionConfig.modelId = value.trim();
            break;
          }
          case "max_thinking_tokens": {
            const normalizedValue =
              typeof value === "string" ? value.trim().toLowerCase() : value;
            const parsed =
              normalizedValue === "adaptive" || normalizedValue === "unlimited"
                ? null
                : typeof normalizedValue === "number"
                  ? normalizedValue
                  : Number(normalizedValue);
            if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
              throw new Error("max_thinking_tokens must be a positive number or 'adaptive'");
            }
            await session.query.setMaxThinkingTokens(parsed);
            session.sessionConfig.maxThinkingTokens = parsed;
            session.sessionConfig.thoughtLevelId =
              parsed === 1024 ? "low" : parsed === 4096 ? "medium" : parsed === 8192 ? "high" : "adaptive";
            break;
          }
          case "output_style": {
            if (typeof value !== "string" || value.trim().length === 0) {
              throw new Error("output_style must be a non-empty string");
            }
            const queryWithOutputStyle = session.query as typeof session.query & {
              setOutputStyle?: (style: string) => Promise<void>;
            };
            if (typeof queryWithOutputStyle.setOutputStyle === "function") {
              await queryWithOutputStyle.setOutputStyle(value.trim());
            }
            session.sessionConfig.outputStyleId = value.trim();
            break;
          }
          default:
            throw new Error(
              `Unsupported setting '${input.setting}'. Supported settings: mode, model, max_thinking_tokens, output_style.`,
            );
        }

        return {
          content: [{ type: "text", text: `Updated '${input.setting}' successfully.` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Config update failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.slashCommand,
    {
      title: unqualifiedToolNames.slashCommand,
      description: "Run a slash command using a detached SDK query for ACP compatibility.",
      inputSchema: { command: z.string(), args: z.string().optional() },
    },
    async (input: { command: string; args?: string }) => {
      try {
        const command = input.command.trim();
        if (!command) {
          throw new Error("command is required");
        }
        const normalizedCommand = command.startsWith("/") ? command : `/${command}`;
        const prompt = input.args ? `${normalizedCommand} ${input.args}` : normalizedCommand;
        const result = await detachedPrompt(prompt);
        return {
          content: [{ type: "text", text: result }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Slash command failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  server.registerTool(
    unqualifiedToolNames.skill,
    {
      title: unqualifiedToolNames.skill,
      description: "Run a skill command using a detached SDK query for ACP compatibility.",
      inputSchema: { name: z.string(), input: z.record(z.string(), z.unknown()).optional() },
    },
    async (input: { name: string; input?: Record<string, unknown> }) => {
      try {
        const name = input.name.trim();
        if (!name) {
          throw new Error("name is required");
        }
        const command = name.startsWith("/") ? name : `/${name}`;
        const argString =
          input.input && Object.keys(input.input).length > 0 ? ` ${JSON.stringify(input.input)}` : "";
        const result = await detachedPrompt(`${command}${argString}`);
        return {
          content: [{ type: "text", text: result }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: "Skill execution failed: " + formatErrorMessage(error) }],
        };
      }
    },
  );

  const readBackgroundTaskOutput = async (input: TaskOutputInput) => {
    const bgTerm = agent.backgroundTerminals[input.task_id];

    if (!bgTerm) {
      throw new Error(`Unknown shell ${input.task_id}`);
    }

    if (input.block && bgTerm.status === "started") {
      const statusPromise = Promise.race([
        bgTerm.handle.waitForExit().then((exitStatus) => ({ status: "exited" as const, exitStatus })),
        sleep(input.timeout ?? 2 * 60 * 1000).then(async () => {
          if (bgTerm.status === "started") {
            await bgTerm.handle.kill();
          }
          return { status: "timedOut" as const, exitStatus: null };
        }),
      ]);

      const { status, exitStatus } = await statusPromise;
      const currentOutput = await bgTerm.handle.currentOutput();
      const strippedOutput = stripCommonPrefix(
        bgTerm.lastOutput?.output ?? "",
        currentOutput.output,
      );

      agent.backgroundTerminals[input.task_id] = {
        status,
        pendingOutput: {
          ...currentOutput,
          output: strippedOutput,
          exitStatus: exitStatus ?? currentOutput.exitStatus,
        },
      };

      await bgTerm.handle.release();

      return toolCommandOutput(status, {
        ...currentOutput,
        output: strippedOutput,
        exitStatus: exitStatus ?? currentOutput.exitStatus,
      });
    }

    if (bgTerm.status === "started") {
      const newOutput = await bgTerm.handle.currentOutput();
      const strippedOutput = stripCommonPrefix(bgTerm.lastOutput?.output ?? "", newOutput.output);
      bgTerm.lastOutput = newOutput;
      return toolCommandOutput(bgTerm.status, {
        ...newOutput,
        output: strippedOutput,
      });
    }

    return toolCommandOutput(bgTerm.status, bgTerm.pendingOutput);
  };

  const stopBackgroundTask = async (input: TaskStopInput) => {
    const shellId = input.task_id ?? input.shell_id;
    if (!shellId) {
      throw new Error("TaskStop requires task_id or shell_id");
    }
    const bgTerm = agent.backgroundTerminals[shellId];
    if (!bgTerm) {
      throw new Error(`Unknown shell ${shellId}`);
    }

    switch (bgTerm.status) {
      case "started": {
        await bgTerm.handle.kill();
        const currentOutput = await bgTerm.handle.currentOutput();
        agent.backgroundTerminals[bgTerm.handle.id] = {
          status: "killed",
          pendingOutput: {
            ...currentOutput,
            output: stripCommonPrefix(bgTerm.lastOutput?.output ?? "", currentOutput.output),
          },
        };
        await bgTerm.handle.release();
        return "Command killed successfully.";
      }
      case "aborted":
        return "Command aborted by user.";
      case "exited":
        return "Command had already exited.";
      case "killed":
        return "Command was already killed.";
      case "timedOut":
        return "Command killed by timeout.";
      default:
        unreachable(bgTerm);
        throw new Error("Unexpected background terminal status");
    }
  };

  if (agent.clientCapabilities?.terminal) {
    server.registerTool(
      unqualifiedToolNames.bash,
      {
        title: unqualifiedToolNames.bash,
        description: `Executes a bash command

In sessions with ${acpToolNames.bash} always use it instead of Bash`,
        inputSchema: {
          command: z.string().describe("The command to execute"),
          timeout: z.number().describe(`Optional timeout in milliseconds (max ${2 * 60 * 1000})`),
          description: z.string().optional()
            .describe(`Clear, concise description of what this command does in 5-10 words, in active voice. Examples:
Input: ls
Output: List files in current directory

Input: git status
Output: Show working tree status

Input: npm install
Output: Install package dependencies

Input: mkdir foo
Output: Create directory 'foo'`),
          run_in_background: z
            .boolean()
            .default(false)
            .describe(
              `Set to true to run this command in the background. The tool returns an \`id\` that can be used with the \`${acpToolNames.bashOutput}\` tool to retrieve the current output, or the \`${acpToolNames.killShell}\` tool to stop it early.`,
            ),
        },
      },
      async (input: BashInput, extra) => {
        try {
          const session = agent.sessions[sessionId];
          if (!session) {
            return {
              content: [
                {
                  type: "text",
                  text: "The user has left the building",
                },
              ],
            };
          }

          const toolCallId = extra._meta?.["claudecode/toolUseId"];

          if (typeof toolCallId !== "string") {
            throw new Error("No tool call ID found");
          }

          if (!agent.clientCapabilities?.terminal || !agent.client.createTerminal) {
            throw new Error("unreachable");
          }

          const handle = await agent.client.createTerminal({
            command: input.command,
            env: [{ name: "CLAUDECODE", value: "1" }],
            sessionId,
            outputByteLimit: 32_000,
          });

          await agent.client.sessionUpdate({
            sessionId,
            update: {
              sessionUpdate: "tool_call_update",
              toolCallId,
              status: "in_progress",
              title: input.description,
              content: [{ type: "terminal", terminalId: handle.id }],
            },
          });

          const abortPromise = new Promise((resolve) => {
            if (extra.signal.aborted) {
              resolve(null);
            } else {
              extra.signal.addEventListener("abort", () => {
                resolve(null);
              });
            }
          });

          const statusPromise = Promise.race([
            handle.waitForExit().then((exitStatus) => ({ status: "exited" as const, exitStatus })),
            abortPromise.then(() => ({ status: "aborted" as const, exitStatus: null })),
            sleep(input.timeout ?? 2 * 60 * 1000).then(async () => {
              if (agent.backgroundTerminals[handle.id]?.status === "started") {
                await handle.kill();
              }
              return { status: "timedOut" as const, exitStatus: null };
            }),
          ]);

          if (input.run_in_background) {
            agent.backgroundTerminals[handle.id] = {
              handle,
              lastOutput: null,
              status: "started",
            };

            statusPromise.then(async ({ status, exitStatus }) => {
              const bgTerm = agent.backgroundTerminals[handle.id];

              if (bgTerm.status !== "started") {
                return;
              }

              const currentOutput = await handle.currentOutput();

              agent.backgroundTerminals[handle.id] = {
                status,
                pendingOutput: {
                  ...currentOutput,
                  output: stripCommonPrefix(bgTerm.lastOutput?.output ?? "", currentOutput.output),
                  exitStatus: exitStatus ?? currentOutput.exitStatus,
                },
              };

              return handle.release();
            });

            return {
              content: [
                {
                  type: "text",
                  text: `Command started in background with id: ${handle.id}`,
                },
              ],
            };
          }

          await using terminal = handle;

          const { status } = await statusPromise;

          if (status === "aborted") {
            return {
              content: [{ type: "text", text: "Tool cancelled by user" }],
            };
          }

          const output = await terminal.currentOutput();

          return {
            content: [{ type: "text", text: toolCommandOutput(status, output) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Running bash command failed: " + formatErrorMessage(error),
              },
            ],
          };
        }
      },
    );

    server.registerTool(
      unqualifiedToolNames.bashOutput,
      {
        title: unqualifiedToolNames.bashOutput,
        description: `- Retrieves output from a running or completed background bash shell
- Takes a bash_id parameter identifying the shell
- Always returns only new output since the last check
- Returns stdout and stderr output along with shell status
- Use this tool when you need to monitor or check the output of a long-running shell

In sessions with ${acpToolNames.bashOutput} always use it for output from Bash commands instead of TaskOutput.`,
        inputSchema: {
          task_id: z
            .string()
            .describe(
              `The id of the background bash command as returned by \`${acpToolNames.bash}\``,
            ),
          block: z.boolean().describe("Whether to wait for completion"),
          timeout: z.number().describe("Max wait time in ms"),
        },
      },
      async (input: TaskOutputInput) => {
        try {
          const output = await readBackgroundTaskOutput(input);
          return {
            content: [{ type: "text", text: output }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Retrieving bash output failed: " + formatErrorMessage(error),
              },
            ],
          };
        }
      },
    );

    server.registerTool(
      unqualifiedToolNames.taskOutput,
      {
        title: unqualifiedToolNames.taskOutput,
        description:
          "Retrieve output from a background task. Compatible with bash background task IDs.",
        inputSchema: {
          task_id: z.string().describe("Background task id."),
          block: z.boolean().describe("Whether to wait for completion."),
          timeout: z.number().describe("Max wait time in ms."),
        },
      },
      async (input: TaskOutputInput) => {
        try {
          const output = await readBackgroundTaskOutput(input);
          return {
            content: [{ type: "text", text: output }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Retrieving task output failed: " + formatErrorMessage(error),
              },
            ],
          };
        }
      },
    );

    server.registerTool(
      unqualifiedToolNames.killShell,
      {
        title: unqualifiedToolNames.killShell,
        description: `- Kills a running background bash shell by its ID
- Takes a shell_id parameter identifying the shell to kill
- Returns a success or failure status
- Use this tool when you need to terminate a long-running shell

In sessions with ${acpToolNames.killShell} always use it instead of KillShell.`,
        inputSchema: {
          shell_id: z
            .string()
            .describe(
              `The id of the background bash command as returned by \`${acpToolNames.bash}\``,
            ),
        },
      },
      async (input) => {
        try {
          const result = await stopBackgroundTask({ shell_id: input.shell_id });
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Killing shell failed: " + formatErrorMessage(error),
              },
            ],
          };
        }
      },
    );

    server.registerTool(
      unqualifiedToolNames.taskStop,
      {
        title: unqualifiedToolNames.taskStop,
        description: "Stop a background task by task_id or shell_id.",
        inputSchema: {
          task_id: z.string().optional(),
          shell_id: z.string().optional(),
        },
      },
      async (input: TaskStopInput) => {
        try {
          const result = await stopBackgroundTask(input);
          return {
            content: [{ type: "text", text: result }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Stopping task failed: " + formatErrorMessage(error),
              },
            ],
          };
        }
      },
    );
  }

  return server;
}

function stripCommonPrefix(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    i++;
  }
  return b.slice(i);
}

function toolCommandOutput(
  status: "started" | "aborted" | "exited" | "killed" | "timedOut",
  output: TerminalOutputResponse,
): string {
  const { exitStatus, output: commandOutput, truncated } = output;

  let toolOutput = "";

  switch (status) {
    case "started":
    case "exited": {
      if (exitStatus && (exitStatus.exitCode ?? null) === null) {
        toolOutput += `Interrupted by the user. `;
      }
      break;
    }
    case "killed":
      toolOutput += `Killed. `;
      break;
    case "timedOut":
      toolOutput += `Timed out. `;
      break;
    case "aborted":
      break;
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }

  if (exitStatus) {
    if (typeof exitStatus.exitCode === "number") {
      toolOutput += `Exited with code ${exitStatus.exitCode}.`;
    }

    if (typeof exitStatus.signal === "string") {
      toolOutput += `Signal \`${exitStatus.signal}\`. `;
    }

    toolOutput += "Final output:\n\n";
  } else {
    toolOutput += "New output:\n\n";
  }

  toolOutput += commandOutput;

  if (truncated) {
    toolOutput += `\n\nCommand output was too long, so it was truncated to ${commandOutput.length} bytes.`;
  }

  return toolOutput;
}

/**
 * Replace text in a file and calculate the line numbers where the edits occurred.
 *
 * @param fileContent - The full file content
 * @param edits - Array of edit operations to apply sequentially
 * @returns the new content and the line numbers where replacements occurred in the final content
 */
export function replaceAndCalculateLocation(
  fileContent: string,
  edits: Array<{
    oldText: string;
    newText: string;
    replaceAll?: boolean;
  }>,
): { newContent: string; lineNumbers: number[] } {
  let currentContent = fileContent;

  // Use unique markers to track where replacements happen
  const markerPrefix = `__REPLACE_MARKER_${Math.random().toString(36).substr(2, 9)}_`;
  let markerCounter = 0;
  const markers: string[] = [];

  // Apply edits sequentially, inserting markers at replacement positions
  for (const edit of edits) {
    // Skip empty oldText
    if (edit.oldText === "") {
      throw new Error(`The provided \`old_string\` is empty.\n\nNo edits were applied.`);
    }

    if (edit.replaceAll) {
      // Replace all occurrences with marker + newText
      const parts: string[] = [];
      let lastIndex = 0;
      let searchIndex = 0;

      while (true) {
        const index = currentContent.indexOf(edit.oldText, searchIndex);
        if (index === -1) {
          if (searchIndex === 0) {
            throw new Error(
              `The provided \`old_string\` does not appear in the file: "${edit.oldText}".\n\nNo edits were applied.`,
            );
          }
          break;
        }

        // Add content before the match
        parts.push(currentContent.substring(lastIndex, index));

        // Add marker and replacement
        const marker = `${markerPrefix}${markerCounter++}__`;
        markers.push(marker);
        parts.push(marker + edit.newText);

        lastIndex = index + edit.oldText.length;
        searchIndex = lastIndex;
      }

      // Add remaining content
      parts.push(currentContent.substring(lastIndex));
      currentContent = parts.join("");
    } else {
      // Replace first occurrence only
      const index = currentContent.indexOf(edit.oldText);
      if (index === -1) {
        throw new Error(
          `The provided \`old_string\` does not appear in the file: "${edit.oldText}".\n\nNo edits were applied.`,
        );
      } else {
        const marker = `${markerPrefix}${markerCounter++}__`;
        markers.push(marker);
        currentContent =
          currentContent.substring(0, index) +
          marker +
          edit.newText +
          currentContent.substring(index + edit.oldText.length);
      }
    }
  }

  // Find line numbers where markers appear in the content
  const lineNumbers: number[] = [];
  for (const marker of markers) {
    const index = currentContent.indexOf(marker);
    if (index !== -1) {
      const lineNumber = Math.max(
        0,
        currentContent.substring(0, index).split(/\r\n|\r|\n/).length - 1,
      );
      lineNumbers.push(lineNumber);
    }
  }

  // Remove all markers from the final content
  let finalContent = currentContent;
  for (const marker of markers) {
    finalContent = finalContent.replace(marker, "");
  }

  // Dedupe and sort line numbers
  const uniqueLineNumbers = [...new Set(lineNumbers)].sort();

  return { newContent: finalContent, lineNumbers: uniqueLineNumbers };
}
