# 50 Critical Missing Features in Claude Code ACP Adapter

**Analysis Date:** 2026-02-07  
**Current Version:** 0.16.0  
**SDK Versions:** ACP v0.14.1, Claude Agent SDK v0.2.34

---

## 🔴 CRITICAL Priority (Must-Have for Production)

### 1. **Streaming Partial Messages Support**
- **Status:** ❌ Not Implemented (Hardcoded to `true` internally)
- **SDK Feature:** `includePartialMessages` option
- **Impact:** Cannot control real-time streaming behavior
- **Location:** Line 3621 in `acp-agent.ts` - hardcoded
- **Implementation Needed:** Expose as ACP session config option
```typescript
// Current: Always enabled internally
includePartialMessages: true,

// Needed: Configurable via session config
sessionConfig: {
  enablePartialMessages?: boolean;
}
```

### 2. **Skills System Integration**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `settingSources` with Skills support
- **Impact:** Cannot use `.claude/skills/` directory for reusable capabilities
- **Requirements:**
  - Load skills from filesystem via `settingSources: ["user", "project"]`
  - Include `"Skill"` in allowed tools
  - Expose skill metadata to ACP clients
- **Files Needed:** Skills loader, skill metadata parser

### 3. **Structured Output / JSON Schema**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `outputFormat` with `json_schema` type
- **Impact:** Cannot enforce structured responses from agents
- **Implementation Needed:**
```typescript
options: {
  outputFormat: {
    type: "json_schema",
    schema: JSONSchema
  }
}
// Should expose structured_output in result messages
```

### 4. **ClaudeSDKClient for Multi-Turn Conversations**
- **Status:** ❌ Not Implemented (Only uses `query()`)
- **SDK Feature:** `ClaudeSDKClient` class with `send()` and `receive_response()`
- **Impact:** No persistent conversation context across prompts
- **Current:** Each prompt creates new session
- **Needed:** Maintain conversation state, `interrupt()`, session lifecycle

### 5. **Custom System Prompts**
- **Status:** ⚠️ Partially Implemented
- **SDK Feature:** `systemPrompt` string or `SystemPromptPreset` object
- **Current:** No way to customize via ACP
- **Needed:** 
  - Expose as session config option
  - Support preset with append: `{ type: "preset", preset: "claude_code", append: "..." }`

### 6. **Programmatic Subagent Definitions**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `agents` option with `AgentDefinition`
- **Impact:** Cannot create custom subagents programmatically
- **Implementation Needed:**
```typescript
agents: {
  "code-reviewer": {
    description: "Expert code reviewer",
    prompt: "Review code for quality...",
    tools: ["Read", "Grep", "Glob"],
    model: "sonnet"
  }
}
```

### 7. **Plugin System**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `plugins` array with `SdkPluginConfig`
- **Impact:** Cannot load custom plugins with commands, agents, skills
- **Requirements:**
  - Support `{ type: "local", path: "./my-plugin" }`
  - Load plugin manifest
  - Integrate plugin tools/commands

### 8. **Sandbox Configuration**
- **Status:** ⚠️ Partially Implemented (Basic only)
- **SDK Feature:** `SandboxSettings` with network control
- **Missing:**
  - `autoAllowBashIfSandboxed`
  - `excludedCommands` 
  - `allowUnsandboxedCommands`
  - `network.allowLocalBinding`
  - `ignoreViolations`
- **Current:** Only basic sandbox enable/disable

### 9. **Beta Features Support**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `betas: ["context-1m-2025-08-07"]`
- **Impact:** Cannot enable 1M context window or future beta features
- **Implementation:** Add `betas` array to session config

### 10. **Fallback Model Configuration**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `fallbackModel` option
- **Impact:** No automatic failover when primary model unavailable
- **Needed:** Model fallback chain configuration

---

## 🟠 HIGH Priority (Important for Full Feature Parity)

### 11. **WebSearch Tool**
- **Status:** ❌ Not Implemented
- **SDK Feature:** Built-in `WebSearch` tool with domain filtering
- **Missing:**
  - `allowed_domains` parameter
  - `blocked_domains` parameter
  - Web search results in tool responses

### 12. **WebFetch Tool**
- **Status:** ❌ Not Implemented
- **SDK Feature:** Built-in `WebFetch` tool
- **Impact:** Cannot fetch and process web content
- **Parameters:** `url`, `prompt` for content processing

### 13. **AskUserQuestion Tool**
- **Status:** ❌ Not Implemented
- **SDK Feature:** Interactive multi-choice questions
- **Impact:** No interactive user input during execution
- **Requirements:**
  - Support 1-4 questions
  - 2-4 options per question
  - Multi-select support
  - Answer mapping

### 14. **All Hook Events**
- **Status:** ⚠️ Partially Implemented (Only PreToolUse, PostToolUse)
- **SDK Feature:** 12 hook event types
- **Missing Hooks:**
  - `PostToolUseFailure`
  - `Notification`
  - `UserPromptSubmit`
  - `SessionStart`
  - `SessionEnd`
  - `Stop`
  - `SubagentStart`
  - `SubagentStop`
  - `PreCompact`
  - `PermissionRequest`

### 15. **Hook Matchers with Timeouts**
- **Status:** ⚠️ Basic hook support, no matcher filtering
- **SDK Feature:** `HookMatcher` with tool-specific filtering
- **Missing:**
  - Per-tool hook targeting (e.g., `matcher: 'Bash'`)
  - Custom timeout per hook
  - Multiple hooks per event type

### 16. **File Checkpointing API**
- **Status:** ⚠️ Partially Implemented
- **SDK Feature:** Full checkpoint/rewind API
- **Missing:**
  - `rewindFiles(checkpointId)` method exposure to ACP
  - Checkpoint UUID tracking in session updates
  - `extra_args: { 'replay-user-messages': null }` support

### 17. **Edit Tool Advanced Features**
- **Status:** ⚠️ Basic edit only
- **SDK Feature:** Advanced edit parameters
- **Missing:**
  - `replace_all` parameter
  - Replacement count in responses
  - Multi-occurrence handling

### 18. **Write Tool**
- **Status:** ❌ Not clearly differentiated from Edit
- **SDK Feature:** Separate Write tool for file creation
- **Impact:** No explicit file creation vs modification distinction

### 19. **NotebookEdit / NotebookRead Tools**
- **Status:** ❌ Not Implemented
- **SDK Feature:** Jupyter notebook editing
- **Impact:** Cannot work with `.ipynb` files programmatically

### 20. **MultiEdit Tool**
- **Status:** ❌ Not Implemented (if exists in SDK)
- **SDK Feature:** Batch edits across multiple files
- **Impact:** Less efficient multi-file modifications

### 21. **ReadMcpResource Tool**
- **Status:** ⚠️ May be in MCP server code
- **SDK Feature:** Read MCP resources via URI
- **Verification Needed:** Check if exposed to ACP clients

### 22. **Cost and Usage Tracking Enhancements**
- **Status:** ⚠️ Basic tracking only
- **SDK Feature:** Detailed model usage breakdown
- **Missing:**
  - Per-model usage stats
  - Context window estimation
  - Real-time cost accumulation
  - Budget threshold warnings

### 23. **Session Fork Support**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `forkSession: true` when resuming
- **Impact:** Cannot branch conversations from checkpoints

### 24. **User Identifier Tracking**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `user` parameter for analytics
- **Impact:** No user attribution in multi-user scenarios

### 25. **Custom Executable Path**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `pathToClaudeCodeExecutable` option
- **Impact:** Cannot use custom Claude Code builds

---

## 🟡 MEDIUM Priority (Nice-to-Have for Advanced Use Cases)

### 26. **CLAUDE.md Configuration Support**
- **Status:** ❌ Not Implemented
- **SDK Feature:** Project-level configuration via `CLAUDE.md`
- **Impact:** No project-specific settings loaded from markdown

### 27. **Setting Sources Control**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `settingSources: ["user", "project"]`
- **Current:** Only loads from `.claude/settings.json`
- **Missing:** Explicit control over which settings to load

### 28. **Stderr Callback**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `stderr: (data: string) => void` callback
- **Impact:** No access to SDK stderr output for debugging

### 29. **Max Buffer Size Control**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `maxBufferSize` for CLI stdout buffering
- **Impact:** Potential memory issues with large outputs

### 30. **Extra Arguments Pass-Through**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `extraArgs` for CLI arguments
- **Impact:** Cannot pass arbitrary flags to underlying SDK

### 31. **Environment Variable Merging**
- **Status:** ⚠️ Basic support via settings
- **SDK Feature:** `env` option merged with process.env
- **Missing:** Runtime environment variable updates

### 32. **Permission Prompt Tool Name**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `permissionPromptToolName` for MCP-based prompts
- **Impact:** Cannot customize permission UI via MCP

### 33. **Strict MCP Config Validation**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `strictMcpConfig: boolean`
- **Impact:** No validation of MCP server configurations

### 34. **Account Info Exposure**
- **Status:** ⚠️ Fetched but not fully exposed
- **SDK Feature:** `accountInfo()` method on Query
- **Missing:** Structured account data in session info

### 35. **Model Info Metadata**
- **Status:** ❌ Not clearly exposed
- **SDK Feature:** `ModelInfo` type with capabilities
- **Missing:** Model metadata in session config

### 36. **Tool-Specific Permission Callbacks**
- **Status:** ⚠️ Generic canUseTool only
- **SDK Feature:** Per-tool permission logic in hooks
- **Missing:** Tool-specific permission handlers in ACP

### 37. **Background Task Output File Parsing**
- **Status:** ⚠️ Basic summary extraction
- **SDK Feature:** Structured output file parsing
- **Missing:** 
  - Configurable summary extraction patterns
  - Metadata extraction from output files

### 38. **Subagent Type Validation**
- **Status:** ⚠️ Basic normalization only
- **SDK Feature:** Full subagent type registry
- **Missing:** Validate subagent types against known types

### 39. **Tool Use Cache Eviction**
- **Status:** ❌ Unbounded cache
- **SDK Feature:** Cache size limits
- **Risk:** Memory leak in long-running sessions

### 40. **Session Persistence Options**
- **Status:** ⚠️ Always persists to JSONL
- **SDK Feature:** `persistSession: false` to disable
- **Missing:** Configurable persistence (memory-only mode)

---

## 🟢 LOW Priority (Future Enhancements)

### 41. **CLI Path Configuration**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `cliPath` for custom SDK location
- **Impact:** Cannot use non-standard SDK installations

### 42. **Executable Runtime Selection**
- **Status:** ❌ Not Implemented (auto-detect only)
- **SDK Feature:** `executable: 'bun' | 'deno' | 'node'`
- **Impact:** No explicit runtime control

### 43. **Compact Message Hook**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `PreCompact` hook for conversation summarization
- **Impact:** No control over conversation compaction

### 44. **Notification Hook**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `Notification` hook for system messages
- **Impact:** Cannot intercept SDK notifications

### 45. **Stop Hook**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `Stop` hook when agent stops
- **Impact:** No cleanup hook on stop

### 46. **User Prompt Submit Hook**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `UserPromptSubmit` hook for prompt validation
- **Impact:** Cannot validate/modify prompts before submission

### 47. **Subagent Lifecycle Hooks**
- **Status:** ❌ Not Implemented
- **SDK Features:** `SubagentStart`, `SubagentStop` hooks
- **Impact:** No visibility into subagent spawning

### 48. **Permission Request Hook**
- **Status:** ❌ Not Implemented
- **SDK Feature:** `PermissionRequest` hook
- **Impact:** Cannot customize permission flow

### 49. **Session Model State Updates**
- **Status:** ⚠️ Basic model switching only
- **SDK Feature:** Full model state tracking
- **Missing:** Model switch history, model performance metrics

### 50. **AbortController Integration**
- **Status:** ❌ Not Implemented in ACP layer
- **SDK Feature:** `abortController` for cancellation
- **Current:** Cancel via ACP protocol only
- **Missing:** Programmatic abort via controller

---

## 📊 Summary Statistics

| Priority | Count | Percentage |
|----------|-------|------------|
| 🔴 Critical | 10 | 20% |
| 🟠 High | 15 | 30% |
| 🟡 Medium | 15 | 30% |
| 🟢 Low | 10 | 20% |

### By Category

| Category | Missing Features |
|----------|------------------|
| **Configuration Options** | 15 |
| **Built-in Tools** | 8 |
| **Hooks & Lifecycle** | 12 |
| **Session Management** | 6 |
| **Advanced Features** | 9 |

---

## 🎯 Recommended Implementation Roadmap

### Phase 1: Critical Fixes (2-3 weeks)
1. ✅ Structured Output Support (#3)
2. ✅ Skills System Integration (#2)
3. ✅ Custom System Prompts (#5)
4. ✅ Streaming Partial Messages Config (#1)
5. ✅ Programmatic Subagents (#6)

### Phase 2: High Priority Tools (2 weeks)
6. ✅ WebSearch Tool (#11)
7. ✅ WebFetch Tool (#12)
8. ✅ AskUserQuestion Tool (#13)
9. ✅ Complete Hook Events (#14)
10. ✅ Plugin System (#7)

### Phase 3: Enhanced Features (3 weeks)
11. ✅ ClaudeSDKClient Integration (#4)
12. ✅ File Checkpointing API (#16)
13. ✅ Sandbox Configuration (#8)
14. ✅ Beta Features (#9)
15. ✅ Fallback Model (#10)

### Phase 4: Medium Priority (4 weeks)
16-30. Complete remaining medium priority items

### Phase 5: Low Priority (As needed)
31-50. Implement based on user demand

---

## 🔍 Detailed Implementation Notes

### Critical Feature #1: Streaming Partial Messages

**Current State:**
```typescript
// src/acp-agent.ts:3621
includePartialMessages: true, // Hardcoded
```

**Required Changes:**
1. Add to `SessionConfigState`:
```typescript
enablePartialMessagesValueId: ToggleValueId;
```

2. Add to session config options
3. Pass through to SDK `query()` call
4. Expose `SDKPartialAssistantMessage` events to ACP clients

**Files to Modify:**
- `src/acp-agent.ts` (session config)
- `src/types.ts` (if exists)

---

### Critical Feature #2: Skills System

**Required Changes:**
1. Create `src/skills.ts`:
```typescript
export class SkillsManager {
  async loadSkills(cwd: string, sources: SettingSource[]): Promise<Skill[]>
  async getSkillMetadata(): Promise<SkillMetadata[]>
}
```

2. Modify `newSession()` to:
```typescript
options: {
  settingSources: ["user", "project"],
  allowedTools: [...existingTools, "Skill"]
}
```

3. Expose skills in session info updates

**Files to Create:**
- `src/skills.ts`
- `src/tests/skills.test.ts`

**Files to Modify:**
- `src/acp-agent.ts` (session creation)

---

### Critical Feature #3: Structured Output

**Required Changes:**
1. Add to `NewSessionMeta`:
```typescript
outputFormat?: {
  type: "json_schema";
  schema: JSONSchema;
}
```

2. Pass to SDK `query()` call
3. Extract `structured_output` from `ResultMessage`
4. Include in ACP `PromptResponse`

**Schema Validation:**
- Use Zod or Ajv for JSON Schema validation
- Validate before passing to SDK

**Files to Modify:**
- `src/acp-agent.ts` (result handling)
- Add schema validation utility

---

### High Priority Feature #11-13: Web Tools

**WebSearch Implementation:**
```typescript
// Add to acpToolNames
webSearch: "mcp__acp__WebSearch"
webFetch: "mcp__acp__WebFetch"

// Tool conversion in toolInfoFromToolUse()
case "WebSearch":
  return {
    title: `Search: ${input.query}`,
    kind: "web_search",
    content: [{ type: "text", text: `Query: ${input.query}` }]
  };
```

**AskUserQuestion:**
- Intercept in `canUseTool` callback
- Send ACP `requestPermission` with custom UI
- Map user selections back to tool input

---

## 🚨 Breaking Changes to Consider

### For v0.17.0 (Next Minor)
- Add structured output support (backward compatible)
- Add skills system (backward compatible)
- Expose partial messages config (backward compatible)

### For v1.0.0 (Next Major)
- Deprecate hardcoded `includePartialMessages`
- Require explicit session config for advanced features
- Change default sandbox behavior

---

## 📝 Documentation Updates Needed

1. **README.md**
   - Add Skills documentation
   - Add Structured Output examples
   - Update configuration options

2. **docs/ZED_USAGE.md**
   - Document new session config options
   - Add web tools usage examples

3. **New Files:**
   - `docs/SKILLS.md` - Skills system guide
   - `docs/STRUCTURED_OUTPUT.md` - JSON Schema guide
   - `docs/HOOKS.md` - Complete hook reference
   - `docs/SUBAGENTS.md` - Subagent creation guide

---

## ✅ Testing Requirements

### Unit Tests Needed
- Skills loader tests
- Structured output validation tests
- Hook system tests
- Web tools tests

### Integration Tests Needed
- End-to-end skills usage
- Multi-turn conversation with ClaudeSDKClient
- Structured output with complex schemas
- Subagent spawning and lifecycle

### Performance Tests
- Memory usage with tool use cache
- Session persistence overhead
- Hook execution latency

---

## 🔗 References

- [Claude Agent SDK Docs](https://platform.claude.com/docs/en/agent-sdk/overview)
- [ACP Specification](https://agentclientprotocol.com)
- [Current Implementation](https://github.com/zed-industries/claude-code-acp)
- [SDK Gap Backlog](docs/SDK_GAP_100_BACKLOG.md)

---

## 💡 Implementation Complexity Estimates

| Feature | Complexity | LOC Estimate | Risk Level |
|---------|-----------|--------------|------------|
| Structured Output | Medium | ~200 | Low |
| Skills System | High | ~500 | Medium |
| ClaudeSDKClient | High | ~400 | High |
| Web Tools | Low | ~150 | Low |
| Complete Hooks | Medium | ~300 | Medium |
| Plugin System | High | ~600 | High |
| Sandbox Config | Medium | ~200 | Medium |
| Subagents | Medium | ~250 | Medium |
| Custom System Prompts | Low | ~100 | Low |
| Beta Features | Low | ~50 | Low |

**Total Estimated LOC:** ~2,750 lines of new/modified code

---

## 🎓 Key Learnings

1. **Hardcoded Behavior:** Several SDK options are hardcoded instead of configurable
2. **Missing Tool Wrappers:** New SDK tools (WebSearch, WebFetch, AskUserQuestion) not wrapped
3. **Incomplete Hooks:** Only 2 of 12 hook events implemented
4. **No Skills Support:** Major feature gap preventing reusable agent capabilities
5. **No Structured Output:** Cannot enforce response schemas
6. **Single-Turn Only:** Each prompt creates new session context

These gaps prevent the ACP adapter from being a **complete SDK wrapper** and limit advanced use cases like:
- Building reusable agent skills libraries
- Enforcing structured outputs for programmatic consumption
- Creating custom subagent hierarchies
- Fine-grained control over agent behavior via hooks
- Web-aware agents with search capabilities
