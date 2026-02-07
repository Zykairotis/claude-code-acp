# Missing Feature: ExitPlanMode Bypass Permissions Option

**Date:** February 7, 2026  
**Severity:** MEDIUM - Feature parity gap with Claude Code CLI  
**Status:** Identified, ready to implement

---

## 🔍 Issue Description

The Claude Code CLI allows users to exit plan mode with a "clear context and proceed in bypass mode" option, but the ACP adapter does not offer this choice.

### Current Implementation (Line 3191-3240 in src/acp-agent.ts)

```typescript
if (toolName === "ExitPlanMode") {
  const response = await this.client.requestPermission({
    options: [
      {
        kind: "allow_always",
        name: "Yes, and auto-accept edits",
        optionId: "acceptEdits",
      },
      { 
        kind: "allow_once", 
        name: "Yes, and manually approve edits", 
        optionId: "default" 
      },
      { 
        kind: "reject_once", 
        name: "No, keep planning", 
        optionId: "plan" 
      },
    ],
    // ...
  });
}
```

### What's Missing

**4th Option:** "Yes, bypass all permissions"
- Should switch to `bypassPermissions` mode
- Optionally clear conversation context (start fresh)
- Only available if `ALLOW_BYPASS` is true (not root user)

---

## 🎯 Expected Behavior (Claude Code CLI)

When exiting plan mode in the CLI, users see:

1. ✅ "Yes, auto-accept edits" → `acceptEdits` mode
2. ✅ "Yes, manually approve" → `default` mode  
3. ✅ "No, keep planning" → stay in `plan` mode
4. **❌ MISSING:** "Yes, bypass permissions (clear context)" → `bypassPermissions` mode

The 4th option:
- Clears conversation history (fresh start)
- Switches to bypass permissions mode
- Allows rapid iteration without prompts

---

## 💻 Implementation Plan

### Step 1: Add Bypass Option to ExitPlanMode

**Location:** `src/acp-agent.ts` line ~3195

**Change:**

```typescript
if (toolName === "ExitPlanMode") {
  // Build options array based on what's allowed
  const options: Array<{
    kind: "allow_always" | "allow_once" | "reject_once";
    name: string;
    optionId: string;
  }> = [
    {
      kind: "allow_always",
      name: "Yes, and auto-accept edits",
      optionId: "acceptEdits",
    },
    {
      kind: "allow_once",
      name: "Yes, and manually approve edits",
      optionId: "default",
    },
    {
      kind: "reject_once",
      name: "No, keep planning",
      optionId: "plan",
    },
  ];

  // Add bypass option if allowed (not root user)
  if (ALLOW_BYPASS) {
    options.push({
      kind: "allow_always",
      name: "Yes, bypass all permissions",
      optionId: "bypassPermissions",
    });
  }

  const response = await this.client.requestPermission({
    options,
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
    isPermissionMode(response.outcome.optionId) &&
    response.outcome.optionId !== "plan"
  ) {
    // User approved - switch to selected mode
    session.permissionMode = response.outcome.optionId;
    await this.client.sessionUpdate({
      sessionId,
      update: {
        sessionUpdate: "current_mode_update",
        currentModeId: response.outcome.optionId,
      },
    });

    return {
      behavior: "allow",
      updatedInput: compatibleToolInput,
      updatedPermissions: suggestions ?? [
        { type: "setMode", mode: response.outcome.optionId, destination: "session" },
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
```

### Step 2: Optional - Add Context Clearing

**Advanced Feature:** Add option to clear conversation context when switching to bypass mode.

This would require:
1. Clearing the session transcript
2. Resetting conversation history
3. Starting with a fresh context

**Note:** This is more complex and may require SDK support for conversation clearing.

---

## ✅ Benefits

### User Experience
- **Feature Parity:** Matches Claude Code CLI behavior
- **Flexibility:** Users can choose rapid iteration mode after planning
- **Transparency:** Clear option to bypass permissions when needed

### Use Cases
- **Planning → Execution:** Plan carefully, then execute rapidly
- **Trusted Environments:** Bypass permissions in sandboxed/test environments
- **Iteration Speed:** Quick prototyping after planning phase

---

## ⚠️ Considerations

### Security
- Only enable if `ALLOW_BYPASS` is true (not root user)
- Clearly label the option as "bypass all permissions"
- User explicitly chooses this mode

### Context Clearing
- Should context be cleared when switching to bypass?
- **Option A:** Always clear context (matches CLI)
- **Option B:** Make it optional (user choice)
- **Option C:** Never clear (keep conversation history)

**Recommendation:** Start with Option C (keep context), add clearing later if needed.

---

## 📊 Implementation Estimate

- **Complexity:** LOW
- **Time:** 30 minutes
- **Risk:** LOW (straightforward addition)
- **Testing:** Requires manual testing in Zed

---

## 🧪 Testing Plan

1. **Start in plan mode**
2. **Trigger ExitPlanMode**
3. **Verify 4 options appear** (if not root):
   - Auto-accept edits
   - Manually approve edits
   - Keep planning
   - **Bypass all permissions** ← NEW
4. **Select bypass option**
5. **Verify mode switches** to `bypassPermissions`
6. **Verify subsequent tool calls** execute without prompts

---

## 🔗 Related Code

### Permission Mode Check
```typescript
// Line 347-348 in src/acp-agent.ts
const IS_ROOT = (process.geteuid?.() ?? process.getuid?.()) === 0;
const ALLOW_BYPASS = !IS_ROOT || !!process.env.IS_SANDBOX;
```

### Permission Mode Type
```typescript
// From @anthropic-ai/claude-agent-sdk
type PermissionMode = 
  | "default" 
  | "acceptEdits" 
  | "bypassPermissions" 
  | "plan" 
  | "delegate" 
  | "dontAsk";
```

### Available Modes Function
```typescript
// Line 541-547 in src/acp-agent.ts
function availablePermissionModes(): PermissionMode[] {
  const modes: PermissionMode[] = ["default", "acceptEdits", "plan", "delegate", "dontAsk"];
  if (ALLOW_BYPASS) {
    modes.push("bypassPermissions");
  }
  return modes;
}
```

---

## ✅ Implementation Checklist

- [ ] Add bypass option to ExitPlanMode permission request
- [ ] Update option handling to support `bypassPermissions` choice
- [ ] Test in Zed with plan mode → bypass transition
- [ ] Verify mode switch notification is sent
- [ ] Verify subsequent tools execute without prompts
- [ ] Document behavior in README
- [ ] Add test case for ExitPlanMode with bypass option

---

## 📝 Future Enhancements

1. **Context Clearing**
   - Add option to clear conversation history
   - Reset session transcript
   - Fresh context for execution phase

2. **Custom Exit Options**
   - Allow configuring which modes are available on exit
   - Per-project settings for allowed exit modes

3. **Mode Presets**
   - "Planning → Execution" preset (plan → bypass)
   - "Review → Implement" preset (plan → acceptEdits)

---

## 🎯 Priority

**Priority:** MEDIUM-HIGH  
**User Impact:** HIGH (frequently requested workflow)  
**Implementation Effort:** LOW  
**Recommendation:** Implement immediately (easy win)

This is a **quick win** that significantly improves user experience for the common workflow:
1. Start in plan mode
2. Review the plan
3. Switch to bypass mode for rapid execution

---

## 📚 References

- ExitPlanMode implementation: `src/acp-agent.ts` lines 3191-3240
- Permission modes: `@anthropic-ai/claude-agent-sdk`
- Bypass check: `src/acp-agent.ts` lines 347-348
- ExitPlanMode tool docs: SDK documentation (verified via Context7)
