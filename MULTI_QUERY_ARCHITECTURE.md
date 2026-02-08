# Multi-Query Session Architecture Design

**Goal:** Enable true context clearing by supporting multiple SDK queries per ACP session

---

## 📊 Current Architecture Analysis

### How It Works Now
```typescript
// One query() per ACP session - created in newSession()
const q = query({ prompt: input, options });

// Session stores the query
this.sessions[sessionId] = {
  query: q,              // Single query for entire session lifetime
  input: input,          // Pushable stream for multi-turn conversations
  // ...
};

// Subsequent prompts push to the same input stream
session.input.push({ type: "user_message", text: prompt });
```

### The Problem
- **One query = One SDK conversation**
- All messages go through the same query → all share the same context
- No way to "clear" context mid-session without creating a new ACP session

---

## 🎯 Proposed Multi-Query Architecture

### Key Insight
The SDK `query()` function supports two modes:
```typescript
// Fresh context (no resume)
const freshQuery = query({ prompt, options });

// Resume existing conversation (keeps context)
const resumedQuery = query({ prompt, options: { resume: sessionId } });
```

### Solution
**Allow multiple queries per ACP session, switching between them as needed**

---

## 🏗️ Architecture Design

### 1. Enhanced Session State
```typescript
type Session = {
  query: Query;                    // Current active query
  input: Pushable<SDKUserMessage>; // Current input stream
  cancelled: boolean;
  permissionMode: PermissionMode;
  sessionConfig: SessionConfigState;
  settingsManager: SettingsManager;
  userMessageCheckpoints: string[];
  lastAvailableCommands: AvailableCommand[];
  
  // NEW FIELDS for multi-query support
  queryHistory: Query[];           // Track all queries for cleanup
  sdkSessionId: string | null;     // Track SDK session ID for resume
  contextCleared: boolean;         // Flag when context was cleared
};
```

### 2. Options Builder
Extract options building into reusable method:
```typescript
private buildQueryOptions(
  sessionId: string,
  session: Session,
  clearContext: boolean = false
): Options {
  // Build options from session state
  // If clearContext=true, omit 'resume' option
  // If clearContext=false, include resume: session.sdkSessionId
}
```

### 3. Start Fresh Query Method
```typescript
private async startFreshQuery(
  sessionId: string,
  initialPrompt: string,
  clearContext: boolean = true
): Promise<void> {
  const session = this.getSessionOrThrow(sessionId);
  
  // 1. Close old query (cleanup)
  const oldQuery = session.query as Query & { close?: () => void };
  if (typeof oldQuery.close === "function") {
    try {
      oldQuery.close();
    } catch (error) {
      // Suppress benign errors
    }
  }
  
  // 2. Build fresh options (no resume if clearing context)
  const options = this.buildQueryOptions(sessionId, session, clearContext);
  if (clearContext) {
    delete options.resume;  // This is the KEY to clearing context!
  }
  
  // 3. Create new input stream
  const newInput = new Pushable<SDKUserMessage>();
  
  // 4. Create new query
  const newQuery = query({
    prompt: newInput,
    options,
  });
  
  // 5. Update session
  session.query = newQuery;
  session.input = newInput;
  session.queryHistory.push(newQuery);
  session.contextCleared = clearContext;
  
  // 6. Send initial prompt
  newInput.push({
    type: "user_message",
    text: initialPrompt,
  });
  
  // 7. Re-attach to prompt() message loop
  // (The existing prompt() loop will continue reading from the new query)
}
```

### 4. ExitPlanMode Integration
```typescript
if (selectedOption === "clearAndBypass") {
  // Switch mode first
  session.permissionMode = "bypassPermissions";
  await this.client.sessionUpdate({
    sessionId,
    update: {
      sessionUpdate: "current_mode_update",
      currentModeId: "bypassPermissions",
    },
  });
  
  // Start fresh query WITHOUT context
  await this.startFreshQuery(
    sessionId,
    `Implement the following plan with full permissions:\n\n${toolInput.plan}`,
    clearContext: true  // <-- TRUE CONTEXT CLEARING!
  );
  
  return {
    behavior: "allow",
    updatedInput: compatibleToolInput,
    updatedPermissions: suggestions ?? [
      { type: "setMode", mode: "bypassPermissions", destination: "session" },
    ],
  };
}
```

---

## 🔄 Message Flow

### Current Flow (Single Query)
```
ACP Session
  └─ Query (created once)
       └─ Input Stream (push messages)
            ├─ Message 1 (context: [])
            ├─ Message 2 (context: [1])
            ├─ Message 3 (context: [1,2])
            └─ Message 4 (context: [1,2,3])  ← Can't clear!
```

### New Flow (Multi-Query)
```
ACP Session
  ├─ Query 1 (initial)
  │    └─ Input Stream 1
  │         ├─ Message 1 (context: [])
  │         └─ Message 2 (context: [1])
  │
  └─ Query 2 (after clear context)
       └─ Input Stream 2
            ├─ Message 3 (context: [])  ← Fresh context!
            └─ Message 4 (context: [3])
```

---

## 🧪 Implementation Challenges

### Challenge 1: Prompt() Loop Integration
**Problem:** `prompt()` returns a generator that reads from `session.query`

**Solution:** The existing loop already reads from `session.query`, so when we replace it, the next iteration will naturally read from the new query!

```typescript
async prompt(params: PromptRequest): Promise<PromptResponse> {
  const session = this.sessions[params.sessionId];
  
  // Push to CURRENT input stream
  session.input.push({ type: "user_message", text: params.prompt });
  
  // Read from CURRENT query (could be new query after context clear)
  for await (const message of session.query) {
    // Process message...
  }
}
```

### Challenge 2: Timing
**Problem:** When to switch queries?

**Solution:** Switch BEFORE returning from permission handler, so the next prompt() call uses the new query

### Challenge 3: SDK Session ID Tracking
**Problem:** Need to track SDK session ID for resume

**Solution:** Extract from first system message with `session_id` field

---

## ✅ Benefits

1. **True Context Clearing** - Fresh SDK conversation with no history
2. **Backward Compatible** - Existing behavior unchanged (single query)
3. **Clean Architecture** - Queries properly lifecycle managed
4. **Flexible** - Can support context clearing anywhere, not just ExitPlanMode

---

## 📝 Implementation Steps

1. ✅ Analyze current architecture (DONE)
2. ⏳ Add new session state fields
3. ⏳ Extract options builder method
4. ⏳ Implement startFreshQuery()
5. ⏳ Update ExitPlanMode to use startFreshQuery()
6. ⏳ Handle query cleanup (store history)
7. ⏳ Track SDK session ID
8. ⏳ Test context clearing
9. ⏳ Update documentation

---

## 🔍 Key Files to Modify

- `src/acp-agent.ts`:
  - Line ~175: Update `Session` type
  - Line ~3400-3800: Extract options builder
  - New method: `buildQueryOptions()`
  - New method: `startFreshQuery()`
  - Line ~3245: Update ExitPlanMode handler
  - Line ~2399: Track SDK session ID in prompt()

---

## 🎯 Success Criteria

1. ✅ Context actually clears (verify via testing)
2. ✅ Existing functionality unchanged
3. ✅ All 165 tests still pass
4. ✅ No memory leaks (old queries cleaned up)
5. ✅ Clean error handling

---

*Ready to implement!*
