# Live Context Clearing Validation Guide

**Purpose:** Verify that context clearing truly works with the real Claude API

---

## 🎯 What We're Testing

Our multi-query architecture should enable TRUE context clearing:
- Session starts with Query 1 (has conversation history)
- After context clear → Query 2 starts (NO conversation history)
- Claude should have ZERO memory of previous conversation

---

## 🧪 Test Plan

### Test 1: Establish Context
```
User: "Remember this secret code: ALPHA-7-BETA. What is the code?"
Expected: Claude responds with "ALPHA-7-BETA"
Result: ✅ Context established
```

### Test 2: Verify Context Persists
```
User: "What was the secret code I told you earlier?"
Expected: Claude responds with "ALPHA-7-BETA"
Result: ✅ Context persisting (normal behavior)
```

### Test 3: Clear Context
```
Internal: startFreshQuery(sessionId, newPrompt, clearContext=true)
Expected: New query created WITHOUT 'resume' option
Result: ✅ Fresh query started
```

### Test 4: Verify Context Cleared
```
User: "Do you remember any secret code?"
Expected: Claude says NO or doesn't know any code
Result: ✅ Context CLEARED if Claude doesn't mention ALPHA-7-BETA
Result: ❌ Context NOT cleared if Claude mentions ALPHA-7-BETA
```

---

## 🚀 How to Run

### Prerequisites
```bash
# You need a valid Anthropic API key
export ANTHROPIC_API_KEY="your_key_here"
```

### Run the Test
```bash
# Full test suite
npm run test -- src/tests/live-context-clearing.test.ts

# With verbose output
npm run test -- src/tests/live-context-clearing.test.ts --reporter=verbose

# Watch mode for development
npm run test -- src/tests/live-context-clearing.test.ts --watch
```

---

## 📊 Expected Output

### Success Scenario ✅
```
[Test] Session created: abc-123-def
[Test] First message sent: Ask about secret code
[Test] Claude should remember the code ALPHA-7-BETA
✓ should create a session and track conversation history

[Test] Asking Claude to recall the secret code...
[Test] Claude should respond with ALPHA-7-BETA
✓ should remember context in subsequent messages

[Test] Clearing context and starting fresh query...
[Test] Fresh query started - context should be CLEARED
✓ should clear context when using startFreshQuery

[Test] Asking if Claude remembers the secret code...
[Test] Expected: Claude says NO or doesn't know
[Test] If Claude mentions ALPHA-7-BETA, context clearing FAILED
✓ should NOT remember previous context after clearing

[Test] Checking query history...
[Test] Number of queries: 2
[Test] Context cleared flag: true
✓ should track multiple queries in queryHistory

All tests passed! ✅
```

### Failure Scenario ❌
```
[Test] Asking if Claude remembers the secret code...
[Test] Claude response: "Yes, the secret code is ALPHA-7-BETA"
❌ FAILED: Context was NOT cleared properly
```

---

## 🔍 What to Look For

### Signs Context Clearing Works ✅
1. **Query count increases** - `queryHistory.length` goes from 1 to 2
2. **contextCleared flag set** - `session.contextCleared === true`
3. **Claude has no memory** - Doesn't mention ALPHA-7-BETA after clearing
4. **Fresh responses** - Claude treats conversation as brand new

### Signs Context Clearing Fails ❌
1. **Claude remembers code** - Mentions ALPHA-7-BETA after "clearing"
2. **Query count doesn't increase** - Still only 1 query
3. **Errors during clearing** - Exceptions or warnings
4. **SDK errors** - 400/500 responses from API

---

## 🐛 Troubleshooting

### API Key Issues
```
Error: Missing ANTHROPIC_API_KEY
Solution: export ANTHROPIC_API_KEY="your_key"
```

### Rate Limiting
```
Error: 429 Too Many Requests
Solution: Wait a minute and try again
```

### Network Issues
```
Error: Network timeout
Solution: Check internet connection, try again
```

### Test Timeout
```
Error: Test exceeded 60000ms timeout
Solution: Increase timeout in test file or check API responsiveness
```

---

## 📝 Manual Validation Steps

If automated tests are unclear, validate manually:

### Step 1: Start Session
```typescript
const response = await agent.newSession({
  cwd: "./test",
  prompt: "Remember: SECRET=XYZ123. What is the secret?",
});
```
**Verify:** Claude responds with "XYZ123"

### Step 2: Check Memory
```typescript
await agent.prompt({
  sessionId,
  prompt: "What secret did I tell you?",
});
```
**Verify:** Claude mentions "XYZ123"

### Step 3: Clear Context
```typescript
// Access private method for testing
const agentAny = agent as any;
await agentAny.startFreshQuery(
  sessionId,
  "What secret did I tell you? (You shouldn't know)",
  true
);
```
**Verify:** No errors, fresh query started

### Step 4: Verify Clearing
```typescript
await agent.prompt({
  sessionId,
  prompt: "Do you remember any secrets?",
});
```
**Verify:** Claude says NO or doesn't know ✅

---

## ✅ Success Criteria

Context clearing is working if ALL of these are true:

1. ✅ Session creates successfully with initial query
2. ✅ Claude remembers information from first query
3. ✅ `startFreshQuery()` executes without errors
4. ✅ `queryHistory.length` increases after clearing
5. ✅ `contextCleared` flag is set to true
6. ✅ Claude has NO memory of previous conversation
7. ✅ Fresh query works normally (can have new conversation)
8. ✅ All 165 existing tests still pass

---

## 📈 Results Documentation

After running tests, document:

```markdown
## Live Validation Results

**Date:** YYYY-MM-DD
**API:** Claude 3.5 Sonnet
**Test Duration:** X minutes

### Test Results
- [ ] Context established ✅
- [ ] Context persists ✅
- [ ] Context clears ✅
- [ ] Memory erased ✅
- [ ] Multi-query tracking ✅

### Observations
- Query 1 → Query 2 transition: [smooth/errors]
- Claude behavior after clear: [no memory/remembered]
- Performance: [fast/slow]

### Conclusion
Context clearing is: [WORKING ✅ / NOT WORKING ❌]

### Evidence
[Paste relevant console output or screenshots]
```

---

## 🎉 What Success Means

If all tests pass:
- ✅ Multi-query architecture is production-ready
- ✅ Context clearing truly works
- ✅ ExitPlanMode "clear and bypass" is fully functional
- ✅ Ready to ship! 🚀

---

*Last Updated: February 8, 2026*
