# Remaining Critical Features (41/50)

**Status:** 9 features completed, 41 remaining  
**Date:** February 7, 2026

---

## 🔴 CRITICAL Priority (Remaining: 4/10)

### ✅ Already Completed
- ✅ #1: Streaming Partial Messages Support
- ✅ #5: Custom System Prompts
- ✅ #9: Beta Features Support
- ✅ #3: Structured Output / JSON Schema
- ✅ #2: Skills System Integration
- ✅ #6: Programmatic Subagents

### ❌ Still Missing

#### 4. **ClaudeSDKClient for Multi-Turn Conversations** 🔴
- **Current State:** Each prompt creates new session, no persistent conversation
- **SDK Feature:** `ClaudeSDKClient` class with `send()` and `receive_response()`
- **Impact:** HIGH - Cannot maintain conversation context across prompts
- **Complexity:** HIGH
- **Estimated Time:** 4-6 hours
- **Priority:** CRITICAL
- **Verification Needed:** ✅ Already verified in SDK docs

#### 7. **Plugin System** 🔴
- **Current State:** No plugin support
- **SDK Feature:** `plugins` array with `SdkPluginConfig`
- **Impact:** HIGH - Cannot extend with custom functionality
- **Complexity:** HIGH
- **Estimated Time:** 4-6 hours
- **Priority:** CRITICAL
- **Verification Needed:** ⚠️ Need to verify exact API

#### 8. **Advanced Sandbox Configuration** 🔴
- **Current State:** Basic sandbox enable/disable only
- **SDK Feature:** `SandboxSettings` with network control
- **Missing Features:**
  - `autoAllowBashIfSandboxed`
  - `excludedCommands`
  - `allowUnsandboxedCommands`
  - `network.allowLocalBinding`
  - `ignoreViolations`
- **Impact:** MEDIUM-HIGH - Security and isolation features
- **Complexity:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Priority:** HIGH
- **Verification Needed:** ✅ Already verified

#### 10. **Fallback Model Configuration** 🔴
- **Current State:** No automatic failover
- **SDK Feature:** `fallbackModel` option
- **Impact:** MEDIUM - Better reliability
- **Complexity:** LOW
- **Estimated Time:** 1 hour
- **Priority:** MEDIUM-HIGH
- **Verification Needed:** ⚠️ Need to verify API

---

## 🟠 HIGH Priority (Remaining: 11/15)

### ✅ Already Completed
- ✅ #11: WebSearch Tool
- ✅ #12: WebFetch Tool
- ✅ #13: AskUserQuestion Tool

### ❌ Still Missing

#### 14. **All Hook Events (Complete 12 total)** 🟠
- **Current State:** Only PreToolUse, PostToolUse implemented (2/12)
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
- **Impact:** HIGH - No visibility into many lifecycle events
- **Complexity:** MEDIUM
- **Estimated Time:** 3-4 hours
- **Priority:** HIGH
- **Verification Needed:** ✅ Already verified

#### 15. **Hook Matchers with Timeouts** 🟠
- **Current State:** Basic hooks, no filtering
- **SDK Feature:** `HookMatcher` with tool-specific filtering
- **Missing:**
  - Per-tool hook targeting (e.g., `matcher: 'Bash'`)
  - Custom timeout per hook
  - Multiple hooks per event type
- **Impact:** MEDIUM - Fine-grained control
- **Complexity:** MEDIUM
- **Estimated Time:** 2 hours
- **Priority:** MEDIUM-HIGH

#### 16. **File Checkpointing API Enhancement** 🟠
- **Current State:** Basic checkpoint support
- **SDK Feature:** Full checkpoint/rewind API
- **Missing:**
  - `rewindFiles(checkpointId)` method exposure to ACP
  - Checkpoint UUID tracking in session updates
  - `extra_args: { 'replay-user-messages': null }` support
- **Impact:** MEDIUM - Better file history management
- **Complexity:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Priority:** MEDIUM-HIGH

#### 17. **Edit Tool Advanced Features** 🟠
- **Current State:** Basic edit only
- **SDK Feature:** Advanced edit parameters
- **Missing:**
  - `replace_all` parameter
  - Replacement count in responses
  - Multi-occurrence handling
- **Impact:** LOW-MEDIUM - Better editing capabilities
- **Complexity:** LOW
- **Estimated Time:** 1-2 hours
- **Priority:** MEDIUM

#### 18. **Write Tool (Separate from Edit)** 🟠
- **Current State:** Not clearly differentiated
- **SDK Feature:** Separate Write tool for file creation
- **Impact:** LOW - Better tool semantics
- **Complexity:** LOW
- **Estimated Time:** 1 hour
- **Priority:** LOW-MEDIUM

#### 19. **NotebookEdit / NotebookRead Tools** 🟠
- **Current State:** Basic implementation exists
- **SDK Feature:** Jupyter notebook editing
- **Impact:** MEDIUM - Notebook support
- **Complexity:** MEDIUM
- **Estimated Time:** 2 hours
- **Priority:** MEDIUM
- **Note:** May already be implemented, needs verification

#### 20. **MultiEdit Tool** 🟠
- **Current State:** Not implemented (if exists in SDK)
- **SDK Feature:** Batch edits across multiple files
- **Impact:** MEDIUM - Efficiency for multi-file changes
- **Complexity:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Priority:** MEDIUM
- **Verification Needed:** ⚠️ Need to verify if SDK has this

#### 21. **ReadMcpResource Tool Enhancement** 🟠
- **Current State:** May be in MCP server code
- **SDK Feature:** Read MCP resources via URI
- **Impact:** MEDIUM - MCP integration
- **Complexity:** LOW-MEDIUM
- **Estimated Time:** 1-2 hours
- **Priority:** MEDIUM
- **Verification Needed:** ⚠️ Check if exposed to ACP clients

#### 22. **Cost and Usage Tracking Enhancements** 🟠
- **Current State:** Basic tracking only
- **SDK Feature:** Detailed model usage breakdown
- **Missing:**
  - Per-model usage stats
  - Context window estimation
  - Real-time cost accumulation
  - Budget threshold warnings
- **Impact:** MEDIUM - Better cost control
- **Complexity:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Priority:** MEDIUM

#### 23. **Session Fork Support** 🟠
- **Current State:** Not implemented
- **SDK Feature:** `forkSession: true` when resuming
- **Impact:** MEDIUM - Branch conversations
- **Complexity:** MEDIUM
- **Estimated Time:** 2-3 hours
- **Priority:** MEDIUM

#### 24. **User Identifier Tracking** 🟠
- **Current State:** Not implemented
- **SDK Feature:** `user` parameter for analytics
- **Impact:** LOW - Multi-user attribution
- **Complexity:** LOW
- **Estimated Time:** 30 minutes
- **Priority:** LOW-MEDIUM

#### 25. **Custom Executable Path** 🟠
- **Current State:** Not implemented
- **SDK Feature:** `pathToClaudeCodeExecutable` option
- **Impact:** LOW - Custom SDK builds
- **Complexity:** LOW
- **Estimated Time:** 30 minutes
- **Priority:** LOW

---

## 🟡 MEDIUM Priority (Remaining: 15/15)

#### 26. **CLAUDE.md Configuration Support** 🟡
- **Current State:** Not implemented
- **SDK Feature:** Project-level configuration via `CLAUDE.md`
- **Impact:** MEDIUM - Project-specific settings
- **Complexity:** MEDIUM
- **Estimated Time:** 2-3 hours

#### 27. **Setting Sources Control Enhancement** 🟡
- **Current State:** Loads from settings files
- **SDK Feature:** Explicit `settingSources: ["user", "project"]` control
- **Impact:** LOW - Already partially working via Skills
- **Complexity:** LOW
- **Estimated Time:** 1 hour
- **Note:** May already be done in Batch 1

#### 28. **Stderr Callback** 🟡
- **Current State:** Not implemented
- **SDK Feature:** `stderr: (data: string) => void` callback
- **Impact:** LOW - Debugging visibility
- **Complexity:** LOW
- **Estimated Time:** 30 minutes

#### 29. **Max Buffer Size Control** 🟡
- **Current State:** Not implemented
- **SDK Feature:** `maxBufferSize` for CLI stdout buffering
- **Impact:** LOW - Memory management
- **Complexity:** LOW
- **Estimated Time:** 30 minutes

#### 30. **Extra Arguments Pass-Through** 🟡
- **Current State:** Not implemented
- **SDK Feature:** `extraArgs` for CLI arguments
- **Impact:** LOW - Advanced CLI control
- **Complexity:** LOW
- **Estimated Time:** 30 minutes

#### 31. **Environment Variable Runtime Updates** 🟡
- **Current State:** Basic support via settings
- **SDK Feature:** `env` option merged with process.env
- **Impact:** LOW - Runtime env changes
- **Complexity:** LOW
- **Estimated Time:** 1 hour

#### 32. **Permission Prompt Tool Name** 🟡
- **Current State:** Not implemented
- **SDK Feature:** `permissionPromptToolName` for MCP-based prompts
- **Impact:** LOW - Custom permission UI
- **Complexity:** MEDIUM
- **Estimated Time:** 1-2 hours

#### 33. **Strict MCP Config Validation** 🟡
- **Current State:** Not implemented
- **SDK Feature:** `strictMcpConfig: boolean`
- **Impact:** LOW - Config validation
- **Complexity:** LOW
- **Estimated Time:** 30 minutes

#### 34. **Account Info Exposure Enhancement** 🟡
- **Current State:** Fetched but not fully exposed
- **SDK Feature:** `accountInfo()` method on Query
- **Impact:** LOW - Account metadata
- **Complexity:** LOW
- **Estimated Time:** 1 hour

#### 35. **Model Info Metadata** 🟡
- **Current State:** Not clearly exposed
- **SDK Feature:** `ModelInfo` type with capabilities
- **Impact:** LOW - Model capabilities info
- **Complexity:** LOW
- **Estimated Time:** 1 hour

#### 36. **Tool-Specific Permission Callbacks** 🟡
- **Current State:** Generic canUseTool only
- **SDK Feature:** Per-tool permission logic in hooks
- **Impact:** MEDIUM - Fine-grained permissions
- **Complexity:** MEDIUM
- **Estimated Time:** 2 hours

#### 37. **Background Task Output File Parsing** 🟡
- **Current State:** Basic summary extraction
- **SDK Feature:** Structured output file parsing
- **Missing:**
  - Configurable summary extraction patterns
  - Metadata extraction from output files
- **Impact:** LOW - Better task output handling
- **Complexity:** MEDIUM
- **Estimated Time:** 2 hours

#### 38. **Subagent Type Validation** 🟡
- **Current State:** Basic normalization only
- **SDK Feature:** Full subagent type registry
- **Impact:** LOW - Type safety
- **Complexity:** LOW
- **Estimated Time:** 1 hour

#### 39. **Tool Use Cache Eviction** 🟡
- **Current State:** Unbounded cache
- **SDK Feature:** Cache size limits
- **Risk:** Memory leak in long-running sessions
- **Impact:** MEDIUM - Memory management
- **Complexity:** LOW
- **Estimated Time:** 1 hour

#### 40. **Session Persistence Options** 🟡
- **Current State:** Always persists to JSONL
- **SDK Feature:** `persistSession: false` to disable
- **Impact:** LOW - Memory-only mode
- **Complexity:** LOW
- **Estimated Time:** 30 minutes
- **Note:** May already be implemented

---

## 🟢 LOW Priority (Remaining: 10/10)

#### 41. **CLI Path Configuration** 🟢
- **Impact:** VERY LOW
- **Estimated Time:** 30 minutes

#### 42. **Executable Runtime Selection** 🟢
- **Impact:** VERY LOW
- **Estimated Time:** 30 minutes

#### 43. **Compact Message Hook** 🟢
- **Impact:** LOW
- **Estimated Time:** 1 hour

#### 44. **Notification Hook** 🟢
- **Impact:** LOW
- **Estimated Time:** 1 hour

#### 45. **Stop Hook** 🟢
- **Impact:** LOW
- **Estimated Time:** 1 hour

#### 46. **User Prompt Submit Hook** 🟢
- **Impact:** LOW
- **Estimated Time:** 1 hour

#### 47. **Subagent Lifecycle Hooks** 🟢
- **Impact:** LOW
- **Estimated Time:** 2 hours

#### 48. **Permission Request Hook** 🟢
- **Impact:** LOW
- **Estimated Time:** 1 hour

#### 49. **Session Model State Updates** 🟢
- **Impact:** LOW
- **Estimated Time:** 1 hour

#### 50. **AbortController Integration** 🟢
- **Impact:** LOW
- **Estimated Time:** 1 hour

---

## 🎯 Recommended Next Implementation Order

### **Phase 3: Critical Remaining Features** (High Impact)

**Priority 1 - Must Have:**
1. ✅ **Fallback Model** (1 hour) - Easy win
2. ✅ **Advanced Sandbox Config** (2-3 hours) - Security important
3. ✅ **Complete Hook Events** (3-4 hours) - Lifecycle visibility

**Priority 2 - Very Valuable:**
4. ⚠️ **ClaudeSDKClient Multi-Turn** (4-6 hours) - Major feature, verify first
5. ⚠️ **Plugin System** (4-6 hours) - Extensibility, verify first

### **Phase 4: High Priority Enhancements** (Good Impact)

6. ✅ **Hook Matchers** (2 hours)
7. ✅ **File Checkpointing API** (2-3 hours)
8. ✅ **Cost Tracking Enhancements** (2-3 hours)
9. ✅ **Session Fork** (2-3 hours)
10. ✅ **Edit Tool Advanced** (1-2 hours)

### **Phase 5: Medium Priority** (Nice to Have)

11-40. Implement based on user demand

### **Phase 6: Low Priority** (Optional)

41-50. Implement as needed

---

## 📊 Summary Statistics

| Priority | Completed | Remaining | % Complete |
|----------|-----------|-----------|------------|
| 🔴 Critical | 6/10 | 4 | 60% |
| 🟠 High | 4/15 | 11 | 27% |
| 🟡 Medium | 0/15 | 15 | 0% |
| 🟢 Low | 0/10 | 10 | 0% |
| **TOTAL** | **9/50** | **41** | **18%** |

---

## ⏱️ Time Estimates

### Quick Wins (< 2 hours each): 15 features
- Fallback Model (1h)
- Edit Tool Advanced (1-2h)
- User Identifier (30m)
- Custom Executable Path (30m)
- Stderr Callback (30m)
- Max Buffer Size (30m)
- Extra Arguments (30m)
- Env Variable Updates (1h)
- Strict MCP Config (30m)
- Account Info (1h)
- Model Info (1h)
- Subagent Type Validation (1h)
- Cache Eviction (1h)
- Session Persistence (30m)
- All 10 Low Priority features (1h each)

**Total Quick Wins:** ~15-20 hours

### Medium Features (2-4 hours each): 15 features
- Advanced Sandbox (2-3h)
- Complete Hook Events (3-4h)
- Hook Matchers (2h)
- File Checkpointing (2-3h)
- Cost Tracking (2-3h)
- Session Fork (2-3h)
- NotebookEdit/Read (2h)
- MultiEdit (2-3h)
- ReadMcpResource (1-2h)
- CLAUDE.md Support (2-3h)
- Permission Prompt Tool (1-2h)
- Tool-Specific Permissions (2h)
- Background Task Parsing (2h)
- Write Tool Separation (1h)
- Setting Sources (1h)

**Total Medium:** ~30-40 hours

### Complex Features (4-6 hours each): 2 features
- ClaudeSDKClient Multi-Turn (4-6h)
- Plugin System (4-6h)

**Total Complex:** ~8-12 hours

### **Grand Total Remaining:** ~50-70 hours work

---

## 🚀 Next Steps Recommendation

### **Option A: Continue with Quick Wins** (Recommended)
Implement 5 quick features in next 2-3 hours:
1. Fallback Model (1h)
2. Advanced Sandbox Config (2-3h)
3. Edit Tool Advanced (1h)
4. User Identifier (30m)
5. Custom Executable Path (30m)

**Result:** 14/50 features (28%) complete

### **Option B: Tackle Complex Features**
Verify and implement:
1. ClaudeSDKClient Multi-Turn (verify API first)
2. Plugin System (verify API first)

**Result:** High-value features, but risky without verification

### **Option C: Complete High Priority**
Focus on finishing all High Priority features (11 remaining)

**Result:** 20/50 features (40%) complete

---

## ⚠️ Features Requiring Verification

Before implementing, need to verify SDK support:
1. ⚠️ **ClaudeSDKClient** - Verify exact API
2. ⚠️ **Plugin System** - Verify SdkPluginConfig API
3. ⚠️ **Fallback Model** - Verify option exists
4. ⚠️ **MultiEdit Tool** - Verify if SDK has this
5. ⚠️ **ReadMcpResource** - Check ACP exposure

**Recommended:** Run verification queries before implementing these.

---

## ✅ Verified and Ready to Implement

All features from our previous analysis are verified and ready:
- ✅ Advanced Sandbox Config
- ✅ Complete Hook Events
- ✅ Hook Matchers
- ✅ File Checkpointing
- ✅ Edit Tool Advanced
- ✅ Cost Tracking
- ✅ Session Fork
- ✅ All Medium/Low priority features

---

**What would you like to focus on next?**
