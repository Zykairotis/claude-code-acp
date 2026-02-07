# Claude Code SDK Gap Backlog (100 Items)

Generated on: 2026-02-06

Format requested by user: `no`, `reference`, `code_files_to_update`, `psudocode`.

Scope note: these are first-class ACP parity gaps in this adapter relative to Claude Code SDK capabilities.
## Item 001
- no: 001
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Implement `session/set_config_option` request handling in the adapter.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 002
- no: 002
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Return `configOptions` from `newSession` responses.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 003
- no: 003
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Return `configOptions` from `loadSession` responses.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 004
- no: 004
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Return `configOptions` from `unstable_resumeSession` responses.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 005
- no: 005
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Emit `config_option_update` notifications when a config changes.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 006
- no: 006
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Add canonical in-memory session config state (single source of truth).
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 007
- no: 007
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Define stable config IDs/value IDs for model, mode, and thought level.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 008
- no: 008
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Validate config IDs/value IDs and return ACP invalid params errors.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 009
- no: 009
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose model as first-class config selector instead of unstable-only mutation.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 010
- no: 010
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose mode as first-class config selector synchronized with mode updates.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 011
- no: 011
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose thought-level as first-class config selector mapped to SDK controls.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 012
- no: 012
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Support grouped select options (`SessionConfigSelectGroup`) for UX parity.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 013
- no: 013
- reference: [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema) | `node_modules/@agentclientprotocol/sdk/dist/acp.d.ts:767` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2266` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2257` | `src/acp-agent.ts:1099`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/typescript-declarations.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Synchronize `configOptions` with current mode/model updates during streaming.
  2. Introduce a `sessionConfig` object on each session and initialize it in `createSession`.
  3. Expose a `configOptions` array in session responses with stable IDs and allowed values.
  4. Implement `setSessionConfigOption` switch/case mapping each config id to SDK query control calls or local state updates.
  5. Emit `sessionUpdate: "config_option_update"` after successful mutation, and add deterministic tests for valid/invalid IDs.

## Item 014
- no: 014
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | [ACP Session Modes](https://agentclientprotocol.com/protocol/session-modes) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:829` | `src/acp-agent.ts:1099` | `src/acp-agent.ts:1562`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Advertise `delegate` mode in `availableModes`.
  2. Update session mode catalog to include all SDK-supported modes.
  3. Update request validation and error messages to keep ACP behavior strict and predictable.
  4. Map startup values and streaming status updates back to ACP `current_mode_update` and config selectors.
  5. Add integration tests that set mode before, during, and after turns to verify no regression.
  6. Document Zed-side behavior and any mode-specific restrictions.

## Item 015
- no: 015
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | [ACP Session Modes](https://agentclientprotocol.com/protocol/session-modes) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:829` | `src/acp-agent.ts:1099` | `src/acp-agent.ts:1562`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Allow `delegate` in `setSessionMode` switch and SDK call path.
  2. Update session mode catalog to include all SDK-supported modes.
  3. Update request validation and error messages to keep ACP behavior strict and predictable.
  4. Map startup values and streaming status updates back to ACP `current_mode_update` and config selectors.
  5. Add integration tests that set mode before, during, and after turns to verify no regression.
  6. Document Zed-side behavior and any mode-specific restrictions.

## Item 016
- no: 016
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | [ACP Session Modes](https://agentclientprotocol.com/protocol/session-modes) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:829` | `src/acp-agent.ts:1099` | `src/acp-agent.ts:1562`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Allow starting a session in `delegate` mode through ACP config/meta path.
  2. Update session mode catalog to include all SDK-supported modes.
  3. Update request validation and error messages to keep ACP behavior strict and predictable.
  4. Map startup values and streaming status updates back to ACP `current_mode_update` and config selectors.
  5. Add integration tests that set mode before, during, and after turns to verify no regression.
  6. Document Zed-side behavior and any mode-specific restrictions.

## Item 017
- no: 017
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | [ACP Session Modes](https://agentclientprotocol.com/protocol/session-modes) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:829` | `src/acp-agent.ts:1099` | `src/acp-agent.ts:1562`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Propagate `delegate` transitions from SDK status/init into ACP mode state.
  2. Update session mode catalog to include all SDK-supported modes.
  3. Update request validation and error messages to keep ACP behavior strict and predictable.
  4. Map startup values and streaming status updates back to ACP `current_mode_update` and config selectors.
  5. Add integration tests that set mode before, during, and after turns to verify no regression.
  6. Document Zed-side behavior and any mode-specific restrictions.

## Item 018
- no: 018
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | [ACP Session Modes](https://agentclientprotocol.com/protocol/session-modes) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:829` | `src/acp-agent.ts:1099` | `src/acp-agent.ts:1562`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK `accountInfo` as session-level metadata surfaced to ACP clients.
  2. Update session mode catalog to include all SDK-supported modes.
  3. Update request validation and error messages to keep ACP behavior strict and predictable.
  4. Map startup values and streaming status updates back to ACP `current_mode_update` and config selectors.
  5. Add integration tests that set mode before, during, and after turns to verify no regression.
  6. Document Zed-side behavior and any mode-specific restrictions.

## Item 019
- no: 019
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | [ACP Session Modes](https://agentclientprotocol.com/protocol/session-modes) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:829` | `src/acp-agent.ts:1099` | `src/acp-agent.ts:1562`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose output style as session config selector and runtime mutable state.
  2. Update session mode catalog to include all SDK-supported modes.
  3. Update request validation and error messages to keep ACP behavior strict and predictable.
  4. Map startup values and streaming status updates back to ACP `current_mode_update` and config selectors.
  5. Add integration tests that set mode before, during, and after turns to verify no regression.
  6. Document Zed-side behavior and any mode-specific restrictions.

## Item 020
- no: 020
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | [ACP Session Modes](https://agentclientprotocol.com/protocol/session-modes) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:829` | `src/acp-agent.ts:1099` | `src/acp-agent.ts:1562`
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Unhide `/output-style:new` from the slash command filter once supported.
  2. Update session mode catalog to include all SDK-supported modes.
  3. Update request validation and error messages to keep ACP behavior strict and predictable.
  4. Map startup values and streaming status updates back to ACP `current_mode_update` and config selectors.
  5. Add integration tests that set mode before, during, and after turns to verify no regression.
  6. Document Zed-side behavior and any mode-specific restrictions.

## Item 021
- no: 021
- reference: [Claude Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn) | `src/acp-agent.ts:1640` | `src/acp-agent.ts:1468` | `src/tools.ts:106`
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Stop filtering `/cost` from `available_commands_update`.
  2. Adjust slash-command filtering and tool disallow policy to align with SDK capabilities.
  3. Gate risky behavior behind explicit capability checks so clients that cannot render flows still degrade safely.
  4. Ensure command availability and runtime execution paths are both covered by tests.
  5. Emit clear error text for unsupported client UX paths instead of silently hiding capability.
  6. Update docs so users understand command/tool availability per client.

## Item 022
- no: 022
- reference: [Claude Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn) | `src/acp-agent.ts:1640` | `src/acp-agent.ts:1468` | `src/tools.ts:106`
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Stop filtering `/keybindings-help` from `available_commands_update`.
  2. Adjust slash-command filtering and tool disallow policy to align with SDK capabilities.
  3. Gate risky behavior behind explicit capability checks so clients that cannot render flows still degrade safely.
  4. Ensure command availability and runtime execution paths are both covered by tests.
  5. Emit clear error text for unsupported client UX paths instead of silently hiding capability.
  6. Update docs so users understand command/tool availability per client.

## Item 023
- no: 023
- reference: [Claude Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn) | `src/acp-agent.ts:1640` | `src/acp-agent.ts:1468` | `src/tools.ts:106`
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Stop filtering `/login` from `available_commands_update`.
  2. Adjust slash-command filtering and tool disallow policy to align with SDK capabilities.
  3. Gate risky behavior behind explicit capability checks so clients that cannot render flows still degrade safely.
  4. Ensure command availability and runtime execution paths are both covered by tests.
  5. Emit clear error text for unsupported client UX paths instead of silently hiding capability.
  6. Update docs so users understand command/tool availability per client.

## Item 024
- no: 024
- reference: [Claude Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn) | `src/acp-agent.ts:1640` | `src/acp-agent.ts:1468` | `src/tools.ts:106`
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Stop filtering `/logout` from `available_commands_update`.
  2. Adjust slash-command filtering and tool disallow policy to align with SDK capabilities.
  3. Gate risky behavior behind explicit capability checks so clients that cannot render flows still degrade safely.
  4. Ensure command availability and runtime execution paths are both covered by tests.
  5. Emit clear error text for unsupported client UX paths instead of silently hiding capability.
  6. Update docs so users understand command/tool availability per client.

## Item 025
- no: 025
- reference: [Claude Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn) | `src/acp-agent.ts:1640` | `src/acp-agent.ts:1468` | `src/tools.ts:106`
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Stop filtering `/release-notes` from `available_commands_update`.
  2. Adjust slash-command filtering and tool disallow policy to align with SDK capabilities.
  3. Gate risky behavior behind explicit capability checks so clients that cannot render flows still degrade safely.
  4. Ensure command availability and runtime execution paths are both covered by tests.
  5. Emit clear error text for unsupported client UX paths instead of silently hiding capability.
  6. Update docs so users understand command/tool availability per client.

## Item 026
- no: 026
- reference: [Claude Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn) | `src/acp-agent.ts:1640` | `src/acp-agent.ts:1468` | `src/tools.ts:106`
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Stop filtering `/todos` from `available_commands_update`.
  2. Adjust slash-command filtering and tool disallow policy to align with SDK capabilities.
  3. Gate risky behavior behind explicit capability checks so clients that cannot render flows still degrade safely.
  4. Ensure command availability and runtime execution paths are both covered by tests.
  5. Emit clear error text for unsupported client UX paths instead of silently hiding capability.
  6. Update docs so users understand command/tool availability per client.

## Item 027
- no: 027
- reference: [Claude Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn) | `src/acp-agent.ts:1640` | `src/acp-agent.ts:1468` | `src/tools.ts:106`
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Remove `AskUserQuestion` from hard disallow list when client can support prompts.
  2. Adjust slash-command filtering and tool disallow policy to align with SDK capabilities.
  3. Gate risky behavior behind explicit capability checks so clients that cannot render flows still degrade safely.
  4. Ensure command availability and runtime execution paths are both covered by tests.
  5. Emit clear error text for unsupported client UX paths instead of silently hiding capability.
  6. Update docs so users understand command/tool availability per client.

## Item 028
- no: 028
- reference: [Claude Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn) | `src/acp-agent.ts:1640` | `src/acp-agent.ts:1468` | `src/tools.ts:106`
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Map `AskUserQuestion` to ACP permission/question UI contract instead of suppressing it.
  2. Adjust slash-command filtering and tool disallow policy to align with SDK capabilities.
  3. Gate risky behavior behind explicit capability checks so clients that cannot render flows still degrade safely.
  4. Ensure command availability and runtime execution paths are both covered by tests.
  5. Emit clear error text for unsupported client UX paths instead of silently hiding capability.
  6. Update docs so users understand command/tool availability per client.

## Item 029
- no: 029
- reference: [Claude Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn) | `src/acp-agent.ts:1640` | `src/acp-agent.ts:1468` | `src/tools.ts:106`
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Add policy toggle for native `RewindFiles` vs ACP-prefixed rewind wrapper.
  2. Adjust slash-command filtering and tool disallow policy to align with SDK capabilities.
  3. Gate risky behavior behind explicit capability checks so clients that cannot render flows still degrade safely.
  4. Ensure command availability and runtime execution paths are both covered by tests.
  5. Emit clear error text for unsupported client UX paths instead of silently hiding capability.
  6. Update docs so users understand command/tool availability per client.

## Item 030
- no: 030
- reference: [Claude Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn) | `src/acp-agent.ts:1640` | `src/acp-agent.ts:1468` | `src/tools.ts:106`
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Refresh available commands dynamically (not only one-shot after initialization).
  2. Adjust slash-command filtering and tool disallow policy to align with SDK capabilities.
  3. Gate risky behavior behind explicit capability checks so clients that cannot render flows still degrade safely.
  4. Ensure command availability and runtime execution paths are both covered by tests.
  5. Emit clear error text for unsupported client UX paths instead of silently hiding capability.
  6. Update docs so users understand command/tool availability per client.

## Item 031
- no: 031
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:9`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: List directory contents with ACP-prefixed wrapper.
  2. Add `mcp__acp__LS` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 032
- no: 032
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:205`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: File glob search with ACP-prefixed wrapper.
  2. Add `mcp__acp__Glob` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 033
- no: 033
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:215`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Content search with ACP-prefixed wrapper.
  2. Add `mcp__acp__Grep` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 034
- no: 034
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:9`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Background/foreground task execution with ACP-prefixed wrapper.
  2. Add `mcp__acp__Task` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 035
- no: 035
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:32`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Subagent invocation with ACP-prefixed wrapper.
  2. Add `mcp__acp__Agent` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 036
- no: 036
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:273`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Background task termination with ACP-prefixed wrapper.
  2. Add `mcp__acp__TaskStop` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 037
- no: 037
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:113`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Background task output polling with ACP-prefixed wrapper.
  2. Add `mcp__acp__TaskOutput` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 038
- no: 038
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:283`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: MCP resource enumeration with ACP-prefixed wrapper.
  2. Add `mcp__acp__ListMcpResources` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 039
- no: 039
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:314`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: MCP resource read with ACP-prefixed wrapper.
  2. Add `mcp__acp__ReadMcpResource` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 040
- no: 040
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:292`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Notebook read operation with ACP-prefixed wrapper.
  2. Add `mcp__acp__NotebookRead` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 041
- no: 041
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:292`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Notebook edit operation with ACP-prefixed wrapper.
  2. Add `mcp__acp__NotebookEdit` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 042
- no: 042
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:344`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Web search with ACP-prefixed wrapper.
  2. Add `mcp__acp__WebSearch` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 043
- no: 043
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:334`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Web fetch with ACP-prefixed wrapper.
  2. Add `mcp__acp__WebFetch` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 044
- no: 044
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:324`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Todo list updates with ACP-prefixed wrapper.
  2. Add `mcp__acp__TodoWrite` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 045
- no: 045
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:1560`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Runtime config mutation via ACP-prefixed wrapper.
  2. Add `mcp__acp__Config` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 046
- no: 046
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:9`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Direct slash-command execution via ACP-prefixed wrapper.
  2. Add `mcp__acp__SlashCommand` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 047
- no: 047
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `src/mcp-server.ts:64` | `src/tools.ts:43` | `src/tools.ts:106` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk-tools.d.ts:9`
- code_files_to_update: `src/mcp-server.ts`, `src/tools.ts`, `src/acp-agent.ts`, `src/tests/tools.test.ts`, `src/tests/acp-agent.test.ts`
- psudocode:
  1. Goal: Skill execution via ACP-prefixed wrapper.
  2. Add `mcp__acp__Skill` (or equivalent ACP-prefixed id) to tool name catalogs and registration logic.
  3. Define a strict zod schema compatible with SDK input contracts and client capability checks.
  4. Bridge execution to the existing SDK/native path while preserving ACP reviewable content and locations.
  5. Map tool-use and tool-result events into stable ACP `tool_call` / `tool_call_update` payloads.
  6. Add unit tests for success path, error path, and permission-denied path.

## Item 048
- no: 048
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:454` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `abortController` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 049
- no: 049
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:459` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `additionalDirectories` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 050
- no: 050
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:478` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `agent` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 051
- no: 051
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:494` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `agents` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 052
- no: 052
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:500` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `allowedTools` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 053
- no: 053
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:505` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `canUseTool` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 054
- no: 054
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:510` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `continue` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 055
- no: 055
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:514` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `cwd` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 056
- no: 056
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:45` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `disallowedTools` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 057
- no: 057
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:41` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `tools` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 058
- no: 058
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:397` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `env` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 059
- no: 059
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:542` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `executable` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 060
- no: 060
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:546` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `executableArgs` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 061
- no: 061
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:552` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `extraArgs` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 062
- no: 062
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:556` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `fallbackModel` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 063
- no: 063
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:565` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `enableFileCheckpointing` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 064
- no: 064
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:570` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `forkSession` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 065
- no: 065
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:577` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `betas` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 066
- no: 066
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:591` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `hooks` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 067
- no: 067
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:599` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `persistSession` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 068
- no: 068
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:604` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `includePartialMessages` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 069
- no: 069
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:609` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `maxThinkingTokens` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 070
- no: 070
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:66` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `maxTurns` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 071
- no: 071
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:619` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `maxBudgetUsd` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 072
- no: 072
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:54` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `mcpServers` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 073
- no: 073
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:53` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `model` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 074
- no: 074
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:652` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `outputFormat` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 075
- no: 075
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:656` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `pathToClaudeCodeExecutable` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 076
- no: 076
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:665` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `permissionMode` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 077
- no: 077
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:670` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `allowDangerouslySkipPermissions` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 078
- no: 078
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:675` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `permissionPromptToolName` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 079
- no: 079
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:690` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `plugins` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 080
- no: 080
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:694` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `resume` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 081
- no: 081
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:700` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `sessionId` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 082
- no: 082
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:706` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `resumeSessionAt` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 083
- no: 083
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:742` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `sandbox` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 084
- no: 084
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:752` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `settingSources` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 085
- no: 085
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:760` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `debug` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 086
- no: 086
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:765` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `debugFile` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 087
- no: 087
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:770` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `stderr` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 088
- no: 088
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:775` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `strictMcpConfig` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 089
- no: 089
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:796` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `systemPrompt` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 090
- no: 090
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:817` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:449` | `src/acp-agent.ts:1396` | `src/acp-agent.ts:1403` | [ACP Protocol Schema](https://agentclientprotocol.com/protocol/schema)
- code_files_to_update: `src/acp-agent.ts`, `src/tests/acp-agent.test.ts`, `src/tests/settings.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK option `spawnClaudeCodeProcess` as first-class ACP session configuration (not only private _meta override).
  2. Define whether this option is mutable at runtime or creation-time only, and encode that in config option metadata.
  3. Translate validated ACP values to SDK `Options` during session creation, keeping ACP-owned overrides explicit.
  4. If mutable, wire to `setSessionConfigOption` and emit `config_option_update` after successful apply.
  5. Add tests for serialization/validation and one negative test for invalid values.

## Item 091
- no: 091
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:952` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:988` | `src/acp-agent.ts:865` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2261` | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK `Query.setMaxThinkingTokens` as ACP config control.
  2. Create an ACP-facing command/config contract that triggers the corresponding SDK control method or telemetry mapping.
  3. Ensure the adapter sends deterministic session updates and preserves backward compatibility for clients that ignore new metadata.
  4. Map SDK response fields into ACP-native shapes first, then place rich fields under `_meta.claudeCode`.
  5. Add tests for event ordering and cancellation behavior while this control is active.
  6. Document how to invoke the capability from Zed and from generic ACP clients.

## Item 092
- no: 092
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:952` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1013` | `src/acp-agent.ts:865` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2261` | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK `Query.mcpServerStatus` via ACP extension/config surface.
  2. Create an ACP-facing command/config contract that triggers the corresponding SDK control method or telemetry mapping.
  3. Ensure the adapter sends deterministic session updates and preserves backward compatibility for clients that ignore new metadata.
  4. Map SDK response fields into ACP-native shapes first, then place rich fields under `_meta.claudeCode`.
  5. Add tests for event ordering and cancellation behavior while this control is active.
  6. Document how to invoke the capability from Zed and from generic ACP clients.

## Item 093
- no: 093
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:952` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1037` | `src/acp-agent.ts:865` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2261` | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK `Query.reconnectMcpServer` via ACP extension command.
  2. Create an ACP-facing command/config contract that triggers the corresponding SDK control method or telemetry mapping.
  3. Ensure the adapter sends deterministic session updates and preserves backward compatibility for clients that ignore new metadata.
  4. Map SDK response fields into ACP-native shapes first, then place rich fields under `_meta.claudeCode`.
  5. Add tests for event ordering and cancellation behavior while this control is active.
  6. Document how to invoke the capability from Zed and from generic ACP clients.

## Item 094
- no: 094
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:952` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1045` | `src/acp-agent.ts:865` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2261` | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK `Query.toggleMcpServer` via ACP extension/config command.
  2. Create an ACP-facing command/config contract that triggers the corresponding SDK control method or telemetry mapping.
  3. Ensure the adapter sends deterministic session updates and preserves backward compatibility for clients that ignore new metadata.
  4. Map SDK response fields into ACP-native shapes first, then place rich fields under `_meta.claudeCode`.
  5. Add tests for event ordering and cancellation behavior while this control is active.
  6. Document how to invoke the capability from Zed and from generic ACP clients.

## Item 095
- no: 095
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:952` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1061` | `src/acp-agent.ts:865` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2261` | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK `Query.setMcpServers` for dynamic MCP graph updates.
  2. Create an ACP-facing command/config contract that triggers the corresponding SDK control method or telemetry mapping.
  3. Ensure the adapter sends deterministic session updates and preserves backward compatibility for clients that ignore new metadata.
  4. Map SDK response fields into ACP-native shapes first, then place rich fields under `_meta.claudeCode`.
  5. Add tests for event ordering and cancellation behavior while this control is active.
  6. Document how to invoke the capability from Zed and from generic ACP clients.

## Item 096
- no: 096
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:952` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1068` | `src/acp-agent.ts:865` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2261` | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK `Query.streamInput` for native multi-turn stream input mode.
  2. Create an ACP-facing command/config contract that triggers the corresponding SDK control method or telemetry mapping.
  3. Ensure the adapter sends deterministic session updates and preserves backward compatibility for clients that ignore new metadata.
  4. Map SDK response fields into ACP-native shapes first, then place rich fields under `_meta.claudeCode`.
  5. Add tests for event ordering and cancellation behavior while this control is active.
  6. Document how to invoke the capability from Zed and from generic ACP clients.

## Item 097
- no: 097
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:952` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1077` | `src/acp-agent.ts:865` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2261` | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Add explicit session teardown path that calls SDK `Query.close` when needed.
  2. Create an ACP-facing command/config contract that triggers the corresponding SDK control method or telemetry mapping.
  3. Ensure the adapter sends deterministic session updates and preserves backward compatibility for clients that ignore new metadata.
  4. Map SDK response fields into ACP-native shapes first, then place rich fields under `_meta.claudeCode`.
  5. Add tests for event ordering and cancellation behavior while this control is active.
  6. Document how to invoke the capability from Zed and from generic ACP clients.

## Item 098
- no: 098
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:952` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1430` | `src/acp-agent.ts:865` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2261` | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Emit ACP `usage_update` from SDK result usage/cost metrics.
  2. Create an ACP-facing command/config contract that triggers the corresponding SDK control method or telemetry mapping.
  3. Ensure the adapter sends deterministic session updates and preserves backward compatibility for clients that ignore new metadata.
  4. Map SDK response fields into ACP-native shapes first, then place rich fields under `_meta.claudeCode`.
  5. Add tests for event ordering and cancellation behavior while this control is active.
  6. Document how to invoke the capability from Zed and from generic ACP clients.

## Item 099
- no: 099
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:952` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1411` | `src/acp-agent.ts:865` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2261` | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose per-model usage breakdown in update metadata.
  2. Create an ACP-facing command/config contract that triggers the corresponding SDK control method or telemetry mapping.
  3. Ensure the adapter sends deterministic session updates and preserves backward compatibility for clients that ignore new metadata.
  4. Map SDK response fields into ACP-native shapes first, then place rich fields under `_meta.claudeCode`.
  5. Add tests for event ordering and cancellation behavior while this control is active.
  6. Document how to invoke the capability from Zed and from generic ACP clients.

## Item 100
- no: 100
- reference: [Claude Agent SDK TypeScript](https://platform.claude.com/docs/en/agent-sdk/typescript) | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:952` | `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:1412` | `src/acp-agent.ts:865` | `node_modules/@agentclientprotocol/sdk/dist/schema/types.gen.d.ts:2261` | [ACP Prompt Turn](https://agentclientprotocol.com/protocol/prompt-turn)
- code_files_to_update: `src/acp-agent.ts`, `src/tools.ts`, `src/tests/acp-agent.test.ts`, `docs/ZED_USAGE.md`
- psudocode:
  1. Goal: Expose SDK result permission denials and structured output in ACP metadata.
  2. Create an ACP-facing command/config contract that triggers the corresponding SDK control method or telemetry mapping.
  3. Ensure the adapter sends deterministic session updates and preserves backward compatibility for clients that ignore new metadata.
  4. Map SDK response fields into ACP-native shapes first, then place rich fields under `_meta.claudeCode`.
  5. Add tests for event ordering and cancellation behavior while this control is active.
  6. Document how to invoke the capability from Zed and from generic ACP clients.
