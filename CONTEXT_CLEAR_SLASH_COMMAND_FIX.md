# Context Clearing with Slash Commands - Bug Fix

## Problem

When selecting "Yes, clear context and bypass permissions" from the ExitPlanMode options, the `session.contextCleared` flag was set to `true`. However, when the user then ran a slash command like `/context`, the system would:

1. Try to handle the slash command first
2. If the slash command wasn't handled locally (e.g., `/context` passes through to SDK), it would proceed to clear context
3. The context clearing code would call `startFreshQuery()` with the literal text "/context" as a prompt
4. This would result in an "Authentication required" error because the old query was in a bad state

## Root Cause

The order of operations in the `prompt()` method was incorrect:
- Slash commands were being checked BEFORE context clearing
- When context needed to be cleared, the slash command text was being passed to `startFreshQuery()` instead of being handled properly

## Solution

Reordered the `prompt()` method to:

1. **First**: Check if `session.contextCleared` is true
   - If yes, immediately clear context by creating a fresh query (without sending any prompt yet)
   - Close old query, create new input stream and query with no resume option
   - Reset the `contextCleared` flag

2. **Second**: Try to handle slash commands with the now-clean context
   - Slash commands like `/context` will work properly with the fresh query

3. **Third**: Normal prompt handling
   - Push the prompt to the input stream and process normally

## Code Changes

**File**: `src/acp-agent.ts`

**Location**: `async prompt(params: PromptRequest): Promise<PromptResponse>`

### Before
```typescript
// Try handling slash commands first
const localSlashResponse = await this.tryHandleLocalSlashCommand(...);
if (localSlashResponse) return localSlashResponse;

// Then check context clearing
if (session.contextCleared) {
  await this.startFreshQuery(..., params.prompt, true);
  // ...
}
```

### After
```typescript
// First: Clear context if needed
if (session.contextCleared) {
  // Close old query and create fresh one WITHOUT sending prompt
  // ...
  session.contextCleared = false;
}

// Second: Handle slash commands with clean context
const localSlashResponse = await this.tryHandleLocalSlashCommand(...);
if (localSlashResponse) return localSlashResponse;

// Third: Normal prompt handling
input.push(promptToClaude(params));
```

## Testing

Verified that:
- ✅ All existing tests pass
- ✅ Build succeeds without errors
- ✅ Context clearing happens before slash command processing
- ✅ Slash commands work correctly after context is cleared

## User Impact

Users can now:
1. Exit plan mode with "clear context and bypass"
2. Immediately run slash commands like `/context` without errors
3. The context is properly cleared before the slash command executes
