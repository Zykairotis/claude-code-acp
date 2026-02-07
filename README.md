# Claude Code ACP Adapter

[![npm](https://img.shields.io/npm/v/%40zed-industries%2Fclaude-code-acp)](https://www.npmjs.com/package/@zed-industries/claude-code-acp)

An ACP-compatible coding agent powered by the Claude Agent SDK, built to run Claude Code from clients such as Zed.

- Protocol: [Agent Client Protocol (ACP)](https://agentclientprotocol.com)
- SDK: [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)
- Primary client target: [Zed external agents](https://zed.dev/docs/ai/external-agents)

This fork includes substantial parity and reliability work for session config, rewind/checkpoint workflows, background task lifecycle, subagent/tool visibility, command parity, and extension control APIs.

## Highlights

### ACP session capabilities

- `newSession`, `loadSession`
- `unstable_resumeSession`, `unstable_forkSession`, `unstable_listSessions`
- session mode switching and runtime config updates
- usage/context updates via `usage_update`
- auth method support via `authenticate`

### Tooling and protocol behavior

- context attachments and image prompt support
- tool calls with permission flow
- edit diffs and follow locations
- TODO/plan synchronization
- MCP server passthrough/wrappers
- dynamic slash command refresh from SDK

### Background task and subagent improvements

- background `Task`/`Agent` calls stay `in_progress` until completion
- `TaskCompleted` hook and `task_notification` events finalize ACP tool calls
- completion summaries are sent to main chat (`agent_message_chunk`)
- output tail preview prevents loading massive `.output` files
- foreground nested tools are labeled with subagent context

### Rewind and checkpoint support

- ACP `mcp__acp__RewindFiles` wrapper over SDK rewind
- dry-run previews
- checkpoint aliases (`latest`, `previous`, `first`)
- file checkpointing enabled by default (unless explicitly disabled)

### Session config parity

`session/set_config_option` is implemented with runtime + creation-time options.

Runtime-settable:

- `model`
- `mode`
- `thought_level`
- `max_thinking_tokens`
- `output_style`
- `mcp_servers` (switching default/custom; custom payload via extension method)

Creation-time only (set in `newSession`/`loadSession` meta):

- `rewind_policy`
- `additional_directories`
- `allowed_tools`
- `disallowed_tools`
- `tools`
- `env`
- `enable_file_checkpointing`
- `persist_session`
- `max_turns`
- `max_budget_usd`
- `sandbox`

## Architecture

At a high level:

1. ACP client sends session requests and prompts.
2. Adapter starts/controls SDK `query(...)` streams.
3. SDK events are mapped into ACP `session/update` notifications.
4. Tool calls, plans, usage, and status updates are streamed back incrementally.
5. Adapter keeps per-session state for config options, command availability, checkpoints, and background task mappings.

Core files:

- `src/acp-agent.ts`: ACP agent implementation and session lifecycle
- `src/mcp-server.ts`: MCP wrapper tool server exposed to Claude Code
- `src/tools.ts`: tool metadata/content mapping and hook helpers
- `src/settings.ts`: Claude settings merge + permission rule enforcement

## Installation

### Global

```bash
npm install -g @zed-industries/claude-code-acp
```

Run as an ACP server:

```bash
claude-code-acp
```

### Local development

```bash
git clone https://github.com/Zykairotis/claude-code-acp.git
cd claude-code-acp
npm install
npm run build
npm run test:run
```

## Zed usage

### Built-in integration

Recent Zed versions already support Claude Code threads through ACP.

- Open Agent Panel
- Click `+`
- Start `New Claude Code Thread`

### Custom server entry (optional)

If you want to run your own local adapter build, add an agent server in Zed settings:

```json
{
  "agent_servers": {
    "claude-code-acp-local": {
      "type": "custom",
      "command": "node",
      "args": ["/absolute/path/to/claude-code-acp/dist/index.js"],
      "env": {
        "MAX_THINKING_TOKENS": "32768"
      }
    }
  }
}
```

Useful env vars:

- `MAX_THINKING_TOKENS`: default SDK thinking token budget
- `CLAUDE_CODE_EXECUTABLE`: override Claude Code executable path
- `CLAUDE_CONFIG_DIR`: override `.claude` home directory root

### Claude settings precedence

The adapter merges settings from:

1. `~/.claude/settings.json`
2. `<cwd>/.claude/settings.json`
3. `<cwd>/.claude/settings.local.json`
4. managed policy settings (platform path)

This includes permission rules and model/env defaults.

## Extension methods

The adapter supports both fully-qualified and short method names.

- `zed.dev/claude-code-acp/mcp_server_status` (`mcpServerStatus`)
  - params: `sessionId`
- `zed.dev/claude-code-acp/mcp_reconnect` (`reconnectMcpServer`)
  - params: `sessionId`, `serverName`
- `zed.dev/claude-code-acp/mcp_toggle` (`toggleMcpServer`)
  - params: `sessionId`, `serverName`, `enabled`
- `zed.dev/claude-code-acp/mcp_set_servers` (`setMcpServers`)
  - params: `sessionId`, `servers`
- `zed.dev/claude-code-acp/session_info_refresh` (`refreshSessionInfo`)
  - params: `sessionId`
- `zed.dev/claude-code-acp/stream_input` (`streamInput`)
  - params: `sessionId`, and either `text` or `prompt`
- `zed.dev/claude-code-acp/session_close` (`closeSession`)
  - params: `sessionId`

## Background task lifecycle details

When background execution is requested (`run_in_background=true`):

1. Initial tool call is emitted as `in_progress`.
2. Adapter stores task mapping (`task_id`, `output_file`, tool call id).
3. Completion is observed via SDK `TaskCompleted` hook and/or system `task_notification`.
4. Adapter emits:
   - `tool_call_update` -> `completed`/`failed`
   - `agent_message_chunk` summary in main chat
5. Output previews are read from file tail only (bounded size/lines).

This avoids blocking on huge output files and gives deterministic completion UX in ACP clients.

## Tool coverage

In addition to core read/edit/write/bash behavior, wrapper support includes:

- `RewindFiles`
- `Task`, `Agent`, `TaskOutput`, `TaskStop`
- `ListMcpResources`, `ReadMcpResource`
- `NotebookRead`, `NotebookEdit`
- `WebSearch`, `WebFetch`
- `TodoWrite`
- `Config`, `SlashCommand`, `Skill`

## Compatibility notes

- Auth method id: `claude-login`
- Mode support includes `delegate`
- Dynamic command list comes from SDK `supportedCommands()`
- `AskUserQuestion` is bridged through ACP permission selection
- `/hooks` interactive UI is not exposed in this SDK-backed ACP session; manage hooks in `.claude/settings.json`

## Validation

Recommended checks before release:

```bash
npm run build
npm run test:run
npm run lint
```

## Documentation

- Zed usage and implementation notes: [`docs/ZED_USAGE.md`](docs/ZED_USAGE.md)
- Gap tracker/backlog: [`docs/SDK_GAP_100_BACKLOG.md`](docs/SDK_GAP_100_BACKLOG.md)
- ACP protocol: https://agentclientprotocol.com/protocol/overview
- Zed external agents: https://zed.dev/docs/ai/external-agents
- Claude hooks reference: https://docs.anthropic.com/en/docs/claude-code/hooks
- Claude Agent SDK TypeScript: https://platform.claude.com/docs/en/agent-sdk/typescript

## License

Apache-2.0
