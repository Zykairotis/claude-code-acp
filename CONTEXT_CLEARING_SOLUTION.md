# ✅ SOLUTION FOUND: Context Clearing in TypeScript SDK

**Date:** February 7, 2026  
**Status:** ✅ SOLVED - We CAN clear context!
**Method:** Create new query() without resume option

---

## 🎉 The Discovery

The TypeScript SDK **DOES support clearing context** - just not the way Python does!

### Key Finding

```typescript
// Each query() call creates a NEW session by default
const freshQuery = query({ prompt, options });  // ← Fresh context!

// To CONTINUE a session, you use 'resume'
const continuedQuery = query({ 
  prompt, 
  options: { resume: sessionId }  // ← Continues previous context
});
```

---

## 🔑 How It Works

### Session Management Options

1. **`resume: sessionId`** - Resume a previous session with full history
2. **`continue: true`** - Continue most recent session in current directory
3. **No option** - Creates brand new session = FRESH CONTEXT ✅

### From SDK Docs

```typescript
/**
 * Continue the most recent conversation in the current directory 
 * instead of starting a new one.
 */
continue?: boolean;

/**
 * Session ID to resume. Loads the conversation history from 
 * the specified session.
 */
resume?: string;
```

**DEFAULT BEHAVIOR:** New session = fresh context!

---

## 💡 The Solution for "Clear Context and Bypass"

When user selects "Yes, clear context and bypass permissions":

### Current Implementation (Wrong)
```typescript
// We're using the SAME query() call
// Context persists because we're in the same session
```

### Correct Implementation
```typescript
// Option 1: Signal to create new session
if (clearContext) {
  // Close current query
  currentQuery.close();
  
  // Start NEW query without 'resume' option
  const freshQuery = query({
    prompt: `Implement the following plan:\n\n${plan}`,
    options: {
      // NO 'resume' option = fresh context!
      mode: "bypassPermissions",
      allowedTools: [...],
      // ... other options
    }
  });
  
  // Process fresh query
  for await (const message of freshQuery) {
    // This is a FRESH conversation!
  }
}
```

---

## 🏗️ Architecture Change Required

### Current Architecture
```typescript
// We use ONE query() call per ACP session
// Each prompt is sent to the SAME query
for await (const message of query({ prompt, options })) {
  // All prompts share context
}
```

### New Architecture Needed
```typescript
// We need to support MULTIPLE query() calls per ACP session
// Each can be fresh or resumed based on user choice

class SessionState {
  currentQuery: Query | null;
  sessionId: string;
  
  async clearContextAndContinue(prompt: string) {
    // Close old query
    if (this.currentQuery) {
      this.currentQuery.close();
    }
    
    // Start fresh query
    this.currentQuery = query({
      prompt,
      options: {
        // Fresh context - no resume!
      }
    });
    
    // Update session ID to new one
    for await (const message of this.currentQuery) {
      if (message.type === 'system' && message.subtype === 'init') {
        this.sessionId = message.session_id;
      }
      yield message;
    }
  }
}
```

---

## 📊 Implementation Plan

### Phase 1: Refactor ACP Agent to Support Multiple Queries

**Current:** One `query()` call per ACP session  
**Needed:** Multiple `query()` calls, switch between them

**Changes:**
1. Store current `Query` object in session state
2. Add method to start new query (fresh context)
3. Add method to resume query (keep context)
4. Handle query lifecycle (close old, start new)

### Phase 2: Implement Clear Context in ExitPlanMode

**When "clear context and bypass" is selected:**
1. Close current query: `session.currentQuery?.close()`
2. Create new query WITHOUT resume option
3. Send plan as first prompt to fresh query
4. Switch to bypass mode
5. Continue with fresh context

### Phase 3: Test and Verify

**Test:**
1. Create a plan in plan mode
2. Select "clear context and bypass"
3. Verify new query starts
4. Verify context is actually cleared
5. Verify plan is sent to fresh session

---

## 🎯 Key Insight

**The "Problem" was our architecture, not the SDK!**

We've been using ONE `query()` call and trying to clear context within it. 

But the SDK's model is:
- **Each `query()` call = one conversation**
- **Want fresh context? Start a new `query()` call!**
- **Want to resume? Use `resume: sessionId`**

This is actually **BETTER** than disconnect/reconnect because:
- ✅ More explicit control
- ✅ Can manage multiple conversations
- ✅ Can resume any previous session
- ✅ Clean API

---

## ✅ Conclusion

**Context clearing IS possible in TypeScript SDK!**

Method:
1. Close current query
2. Start new query without `resume` option
3. Fresh context achieved!

**Next Steps:**
1. Refactor session state to support multiple queries
2. Implement query switching logic
3. Add clear context functionality
4. Test in Zed

**Complexity:** Medium (requires refactoring)  
**Time Estimate:** 2-3 hours  
**Value:** HIGH - enables proper context clearing!

---

## 🚀 Ready to Implement!

This is a proper solution that uses the SDK correctly.
The TypeScript SDK limitation document was wrong - 
we CAN clear context, just need to refactor our architecture!
