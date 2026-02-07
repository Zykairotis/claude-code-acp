# Clear Context Solution for ExitPlanMode

**Problem:** When selecting "Yes, clear context and bypass permissions", the conversation context is NOT being cleared. Old conversation history remains.

**Root Cause:** The code sets `clearContext: true` flag but doesn't actually invoke the SDK's clear mechanism.

---

## 🔍 How SDK Clears Context

According to SDK docs, there are two ways:

### Option 1: `/clear` Slash Command
```typescript
for await (const message of query({
  prompt: "/clear",
  options: { maxTurns: 1 }
})) {
  if (message.type === "system" && message.subtype === "init") {
    console.log("Conversation cleared, new session started");
  }
}
```

### Option 2: ClaudeSDKClient disconnect/reconnect
```python
await self.client.disconnect()
await self.client.connect()
self.turn_count = 0
print("Started new conversation session (previous context cleared)")
```

---

## 💡 Solution

The ACP adapter uses the `query()` function, not `ClaudeSDKClient`, so **Option 1 (/clear command)** is the way.

But there's a problem: **We're in the middle of handling ExitPlanMode tool approval**. We can't just send `/clear` in the middle of this flow.

### The Challenge

Current flow:
1. ExitPlanMode tool is invoked
2. User selects "clear context and bypass"
3. We return tool approval
4. Next prompt includes the plan
5. **But context is never cleared!**

We need to:
1. Return tool approval
2. **Somehow trigger `/clear`** before the plan is sent
3. Then send the plan to the fresh context

---

## 🎯 Proposed Solutions

### Solution A: Two-Step Process (Complex)
1. Return approval with special flag
2. ACP client intercepts
3. Client sends `/clear` command
4. Client sends plan as new prompt

**Problem:** Requires ACP client changes (Zed modification)

### Solution B: Inject /clear Before Plan (Hacky)
When clearContext is true:
1. Return tool result with `/clear` command first
2. Then include plan in subsequent message

**Problem:** Might not work with tool approval flow

### Solution C: Session Recreation (Best?)
When clearContext is true:
1. Create a NEW session entirely
2. Close old session
3. New session starts with plan as first prompt
4. Old conversation history is gone

**Advantage:** Clean separation, proper context clearing

---

## 🚀 Recommended: Solution C

**Implementation:**

```typescript
// Handle "clear context and bypass"
if (selectedOption === "clearAndBypass") {
  // Instead of modifying current session, signal to create new session
  session.permissionMode = "bypassPermissions";
  
  await this.client.sessionUpdate({
    sessionId,
    update: {
      sessionUpdate: "current_mode_update",
      currentModeId: "bypassPermissions",
    },
  });
  
  // Return approval with special metadata indicating new session needed
  return {
    behavior: "allow",
    updatedInput: {
      ...compatibleToolInput,
      // Signal that after this, client should create new session
      startNewSession: true,
      // Include plan as the first prompt for new session
      newSessionPrompt: `Implement the following plan:\n\n${compatibleToolInput.plan}`,
    },
    updatedPermissions: suggestions ?? [
      { type: "setMode", mode: "bypassPermissions", destination: "session" },
    ],
  };
}
```

But wait... **this requires ACP client support**!

---

## 🤔 The Real Problem

**The ACP adapter can't actually clear context on its own** because:

1. The `query()` function maintains conversation state internally
2. We'd need to use `ClaudeSDKClient` instead (disconnect/reconnect)
3. OR we'd need the ACP client (Zed) to handle creating a new session

**Current architecture limitation:** We're using `query()` which is stateless but conversation-aware. We can't "reset" it mid-conversation.

---

## ✅ Actual Solution: Switch to ClaudeSDKClient

This is **Feature #4: ClaudeSDKClient for Multi-Turn Conversations** from our gap analysis!

To properly support "clear context":
1. Need to refactor to use `ClaudeSDKClient` instead of `query()`
2. `ClaudeSDKClient` allows disconnect/reconnect
3. This gives us true context clearing

**Current:**
```typescript
for await (const message of query({ prompt, options })) {
  // ...
}
```

**Needed:**
```typescript
const client = new ClaudeSDKClient(options);
await client.connect();
await client.query(prompt);
// ... later ...
await client.disconnect();  // ← Clears context
await client.connect();     // ← Fresh start
```

---

## 📊 Temporary Workaround

Until ClaudeSDKClient is implemented, we could:

1. Document the limitation
2. Add note to plan output: "Note: Context clearing requires SDK client refactor (Feature #4)"
3. Best effort: Include `/clear` in the plan prompt

```typescript
if (selectedOption === "clearAndBypass") {
  return {
    behavior: "allow",
    updatedInput: {
      ...compatibleToolInput,
      plan: `/clear\n\nImplement the following plan:\n\n${compatibleToolInput.plan}`,
    },
    // ...
  };
}
```

This might work if the SDK processes `/clear` before the plan text.

---

## 🎯 Recommendation

**Short term:** Try the `/clear` injection workaround

**Long term:** Implement Feature #4 (ClaudeSDKClient) - this is a MAJOR feature that enables:
- True multi-turn conversations
- Proper context clearing
- Session management
- Better control over conversation state

**Should we:**
1. Try the `/clear` workaround now?
2. Skip to implementing ClaudeSDKClient (4-6 hours)?
3. Document the limitation and move on?
