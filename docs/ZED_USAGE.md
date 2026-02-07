# Claude Code ACP in Zed

This document summarizes the recent ACP adapter upgrades, what is still missing, and how to use the features in Zed.

## What Was Added

### 0) Session config parity for model/mode/thought-level/output-style

- Added ACP `session/set_config_option` support.
- Added `configOptions` in:
  - `newSession`
  - `loadSession`
  - `unstable_resumeSession`
- Added deterministic `config_option_update` notifications whenever config state changes.
- Added first-class selectors:
  - `model`
  - `mode`
  - `thought_level` (mapped to `Query.setMaxThinkingTokens`)
  - `output_style` (runtime selector; applies immediately when SDK exposes setter, otherwise maintained as ACP runtime state)
- Added grouped select options support (`SessionConfigSelectGroup`) for UX parity.
- Added validation for invalid config IDs/value IDs via ACP invalid-params errors.
- Added streaming synchronization so SDK mode/model/output-style changes update ACP config state.

### 0.1) Session mode parity updates

- Added `delegate` mode to advertised `availableModes`.
- Added `delegate` support in `setSessionMode`.
- Added startup `delegate` selection via `_meta.claudeCode.sessionConfig.mode` (and ACP-managed startup mode path).
- Added propagation of SDK mode transitions (including `delegate`) into ACP `current_mode_update` and config selectors.
- Added SDK account info into session metadata surfaces (`_meta.claudeCode.accountInfo`).
- Unhid `/output-style:new` from slash-command filtering.

### 1) Rewind files support (`mcp__acp__RewindFiles`)

- Added ACP-native Rewind tool wiring to `Query.rewindFiles(...)`.
- Added support for `dry_run` previews before applying rewinds.
- Added checkpoint aliases for easier use:
  - `latest` / `last` / `newest`
  - `previous` / `prev`
  - `first` / `oldest`
- Added user-message checkpoint tracking from live session events and session history replay so rewind can target real user-message UUID checkpoints.
- Enabled file checkpointing by default at session creation (`enableFileCheckpointing: true` unless explicitly overridden).

### 2) Background task lifecycle and feedback

- Background `Task` / `Agent` tool results with `run_in_background=true` now remain `in_progress` instead of incorrectly finishing early.
- Background metadata extraction now captures:
  - `task_id`
  - `output_file`
    from JSON, tagged output (`<task-id>`, `<output-file>`), and common text forms.
- `system/task_notification` messages are now mapped back to the original ACP tool call and finalize it with:
  - `completed` when done
  - `failed` when failed/stopped (ACP has no distinct `stopped` status enum)
- Output file paths are attached as locations for follow-up navigation.
- Background completion summaries are also emitted as normal `agent_message_chunk` updates so they are visible in the main thread, not only in thinking/tool status UI.
- Foreground nested tool calls now include subagent labels in tool titles (for example `[Explore#toolu_...] Read File`) so concurrent subagents are easier to track.

### 3) Tool/event coverage improvements

- Added or expanded mapping for native Claude Code tools and events already present in SDK output:
  - `Agent`, `TaskOutput`, `TaskStop`
  - `ListMcpResources`, `ReadMcpResource`
  - `AskUserQuestion`, `Config`
  - `tool_progress`, `tool_use_summary`, `auth_status`
- Added handling for additional content block types (`document`, `search_result`, `redacted_thinking`, `container_upload`, `compaction`).

### 4) Authentication method support

- Implemented ACP `authenticate` handling for the advertised `claude-login` method.
- Unsupported auth method IDs now return proper `Invalid params` JSON-RPC errors.

### 5) Slash command parity and dynamic refresh

- Removed hard filtering for built-in slash commands that were previously hidden (`/cost`, `/login`, `/logout`, `/release-notes`, `/todos`, etc.).
- Added per-turn dynamic command refresh using `Query.supportedCommands()` so command availability can change at runtime (for example before/after login) without requiring a new session.

### 6) AskUserQuestion support through ACP permission UI

- Removed `AskUserQuestion` from the hard disallow set.
- Added mapping from SDK `AskUserQuestion` prompts to ACP `requestPermission` options, then returned selected values back to Claude via `updatedInput.answers`.
- This enables clarification flows in ACP clients that support permission-option selection.

### 7) Usage and result telemetry

- Added ACP `usage_update` emission from SDK result usage metrics (`usage`, `modelUsage`, `total_cost_usd`).
- Added per-result metadata in both `usage_update` and prompt response `_meta.claudeCode`, including:
  - per-model usage (`modelUsage`)
  - permission denials (`permission_denials`)
  - structured output (when present)

### 8) Query control extension methods + explicit session close

- Added ACP extension methods (and matching notifications) for high-value Query controls:
  - `mcpServerStatus` / `zed.dev/claude-code-acp/mcp_server_status`
  - `reconnectMcpServer` / `zed.dev/claude-code-acp/mcp_reconnect`
  - `toggleMcpServer` / `zed.dev/claude-code-acp/mcp_toggle`
  - `setMcpServers` / `zed.dev/claude-code-acp/mcp_set_servers`
  - `closeSession` / `zed.dev/claude-code-acp/session_close`
- Added lifecycle-safe session teardown via `Query.close()` and cleanup of session/background-task state.

## How To Use In Zed

### Prerequisites

- Zed with external agents support.
- Claude Code available/authenticated for the current environment.

## Start a Claude Code thread

1. Open Zed’s Agent Panel.
2. Click `+` in the panel.
3. Select `New Claude Code Thread`.

This adapter is built into current Zed releases, so no custom server wiring is required for normal usage.

## Use rewind from chat

In a Claude Code thread, ask the agent to rewind using ACP RewindFiles:

- Preview:
  - "Preview rewind to latest checkpoint and summarize impacted files."
- Apply:
  - "Rewind files to previous checkpoint."
- Specific checkpoint:
  - "Rewind files to user message `<uuid>` with dry_run=false."

Tip: prefer a dry run first to inspect impact before applying.

## Use background tasks

Ask for background execution explicitly, for example:

- "Run this long analysis in the background and report when it completes."
- "Start the task in background and keep me updated from the output file."

Expected behavior:

- Tool call appears as in progress.
- You get feedback updates as background status events arrive.
- Final status updates include summary and output-file location.
- Completion summaries appear in the main chat stream automatically.
- Foreground nested tool calls show subagent label + parent tool id in title.

## Production Readiness Checklist

1. Rewind tool implementation

- Status: complete
- Result: `mcp__acp__RewindFiles` supports UUID targets, aliases (`latest|previous|first`), and `dry_run`.

2. File checkpoint prerequisites

- Status: complete
- Result: `enableFileCheckpointing` defaults to enabled, with user override preserved.

3. Background task lifecycle

- Status: complete
- Result: background Task/Agent calls stay `in_progress` and finalize from `task_notification` updates.

4. Authentication method surface

- Status: complete
- Result: `authenticate` accepts `claude-login` and rejects unsupported method IDs correctly.

5. Test baseline stability

- Status: complete
- Result: host user settings no longer leak into settings tests; full suite is deterministic.

6. Runtime noise cleanup

- Status: complete
- Result: removed debug stderr logging from edit diff parsing.

## Future Enhancements (Optional)

1. Automated Zed UI E2E tests

- Current state: protocol/unit coverage is strong, but this repo does not run Zed GUI automation in CI.

2. Additional multimodal parity

- Current state: audio prompt chunks are preserved as text context markers; direct audio block passthrough is not used.

## Validation Summary

Validated after these changes:

- `npm run build` passes
- `npm run lint` passes
- `npm test -- --run` passes

## References

- Zed external agents: https://zed.dev/docs/ai/external-agents
- Zed ACP overview: https://zed.dev/acp
- ACP protocol docs: https://agentclientprotocol.com/protocol/overview
- Claude Agent SDK TypeScript reference: https://platform.claude.com/docs/en/agent-sdk/typescript
- Claude file checkpointing + rewind: https://platform.claude.com/docs/en/agent-sdk/file-checkpointing
