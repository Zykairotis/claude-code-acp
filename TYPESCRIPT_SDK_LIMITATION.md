# TypeScript SDK Limitation: No ClaudeSDKClient

**Date:** February 7, 2026  
**Issue:** TypeScript SDK does not have ClaudeSDKClient class
**Impact:** Cannot implement true context clearing

---

## 🔍 Discovery

After thorough investigation, I discovered:

### Python SDK
✅ **Has ClaudeSDKClient class** with:
- `connect()` - Start conversation
- `disconnect()` - End conversation (clears context)
- `query()` - Send message in conversation
- `receive_response()` - Get responses
- `interrupt()` - Stop execution

### TypeScript SDK
❌ **NO ClaudeSDKClient class**
✅ **Only has `query()` function** which returns a `Query` interface

**Query interface methods:**
- `interrupt()` - Stop execution ✅
- `setPermissionMode()` - Change mode ✅
- `setModel()` - Change model ✅
- `setMaxThinkingTokens()` - Set thinking limit ✅
- `initializationResult()` - Get init data ✅
- **NO disconnect/reconnect** ❌
- **NO context clearing** ❌

---

## 💔 The Problem

**The TypeScript SDK architecture does NOT support:**

1. ❌ Disconnecting from a session
2. ❌ Reconnecting with fresh context
3. ❌ Clearing conversation history mid-session
4. ❌ Multi-turn conversation management (like Python SDK)

**Current TypeScript architecture:**
```typescript
// Each call to query() is independent
for await (const message of query({ prompt, options })) {
  // Process messages
}

// No way to "disconnect" or "clear context"
// No session lifecycle management
```

**Python SDK architecture:**
```python
# Explicit session management
async with ClaudeSDKClient() as client:
    await client.query("First question")
    # ...
    
    # Clear context!
    await client.disconnect()
    await client.connect()
    
    await client.query("Fresh start")
```

---

## 🚫 Why We Can't Implement Clear Context

The feature "Yes, clear context and bypass permissions" **cannot be properly implemented** in TypeScript because:

1. The SDK doesn't expose disconnect/reconnect
2. The `query()` function maintains internal state we can't access
3. No API exists to clear conversation context
4. TypeScript SDK is fundamentally different from Python SDK

---

## 🎯 Possible Solutions

### Solution 1: Wait for TypeScript SDK Update ⏳
**Status:** Not available yet  
**Timeline:** Unknown  
**Action:** File feature request with Anthropic

### Solution 2: Use Python SDK via Child Process 🐍
**Complexity:** Very High  
**Approach:** 
- Spawn Python process with ClaudeSDKClient
- Communicate via IPC
- Use Python's disconnect/reconnect

**Problems:**
- Requires Python runtime
- Complex IPC setup
- Performance overhead
- Maintenance burden

### Solution 3: Fake Context Clearing 🤷
**Complexity:** Low  
**Approach:**
- Don't actually clear context
- Just switch mode to bypass
- Document the limitation

**Result:**
- User gets bypass mode ✅
- Context NOT cleared ❌
- Better than nothing, but not correct

### Solution 4: Session Recreation via CLI Restart 🔄
**Complexity:** Medium-High  
**Approach:**
- Kill current SDK CLI process
- Start new SDK CLI process
- New process = fresh context

**Problems:**
- Requires process management
- State loss (session data, etc.)
- Complexity in maintaining ACP session
- Risk of data loss

---

## 📊 Recommendation

**Accept the limitation** and implement **Solution 3: Fake Context Clearing**

### Why?

1. **TypeScript SDK doesn't support it** - We can't fix SDK limitations
2. **Python workaround is too complex** - Not worth the engineering effort
3. **Users still get value** - Bypass mode works, just with context
4. **Future-proof** - When SDK adds support, we can enable it

### Implementation

```typescript
if (selectedOption === "clearAndBypass") {
  // Switch to bypass mode
  session.permissionMode = "bypassPermissions";
  
  await this.client.sessionUpdate({
    sessionId,
    update: {
      sessionUpdate: "current_mode_update",
      currentModeId: "bypassPermissions",
    },
  });
  
  // Add warning message
  const warningNote = 
    "\n\n⚠️ Note: Context clearing is not fully supported in TypeScript SDK. " +
    "Conversation history may persist. For true context clearing, " +
    "you may need to create a new session.";
  
  return {
    behavior: "allow",
    updatedInput: {
      ...compatibleToolInput,
      plan: compatibleToolInput.plan + warningNote
    },
    updatedPermissions: suggestions ?? [
      { type: "setMode", mode: "bypassPermissions", destination: "session" },
    ],
  };
}
```

---

## 📝 Documentation Updates

Add to README.md:

```markdown
### Known Limitations

**Clear Context Feature**

The "Yes, clear context and bypass permissions" option in ExitPlanMode 
switches to bypass mode but does NOT fully clear conversation history.

**Reason:** The TypeScript Claude Agent SDK does not expose session 
disconnect/reconnect functionality (available in Python SDK only).

**Workaround:** Create a new session if you need a truly fresh context.

**Status:** Waiting for TypeScript SDK to add ClaudeSDKClient equivalent.
```

---

## ✅ Conclusion

**We CANNOT implement true context clearing** because:
- TypeScript SDK limitation (no ClaudeSDKClient)
- No disconnect/reconnect API
- No way to clear conversation mid-session

**Best approach:**
1. Document the limitation
2. Switch to bypass mode (works)
3. Add warning note about context
4. Wait for SDK update

**This is NOT a bug in our code** - it's an **SDK architecture limitation**.

---

## 🎯 Next Steps

1. ✅ Document limitation
2. ✅ Implement "fake" clear (bypass mode only)
3. ✅ Add warning message to users
4. ❌ Skip ClaudeSDKClient implementation (not possible)
5. ✅ Continue with other features from our list

**Feature #4 (ClaudeSDKClient) status: BLOCKED by SDK limitation**
