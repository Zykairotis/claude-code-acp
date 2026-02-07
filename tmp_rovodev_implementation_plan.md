# Implementation Plan: Critical Features 1-3

## Feature #1: Streaming Partial Messages Configuration

### Current State
- Line 3452: `includePartialMessages: true,` - **HARDCODED**
- Line 282-283: Comment says it will be ignored

### Changes Needed

#### 1. Add to `SessionConfigState` (line 193)
```typescript
type SessionConfigState = {
  // ... existing fields
  enablePartialMessagesValueId: ToggleValueId;  // ADD THIS
}
```

#### 2. Add to `SESSION_CONFIG_IDS` (line 332)
```typescript
const SESSION_CONFIG_IDS = {
  // ... existing
  enablePartialMessages: "enable_partial_messages",  // ADD THIS
} as const;
```

#### 3. Add to `NewSessionMeta.sessionConfig` (line 258)
```typescript
sessionConfig?: {
  // ... existing
  enablePartialMessages?: boolean;  // ADD THIS
}
```

#### 4. Add to `getSessionConfigOptions()` (line 976, after sandbox option)
```typescript
{
  id: SESSION_CONFIG_IDS.enablePartialMessages,
  type: "select",
  name: "Streaming Partial Messages",
  category: "_claude_enable_partial_messages",
  description: "Enable real-time streaming of partial messages. Runtime mutable.",
  currentValue: session.sessionConfig.enablePartialMessagesValueId,
  options: TOGGLE_OPTIONS,
}
```

#### 5. Initialize in `newSession()` (find where sessionConfig is created)
```typescript
enablePartialMessagesValueId: params._meta?.claudeCode?.sessionConfig?.enablePartialMessages === false ? "disabled" : "enabled"
```

#### 6. Change hardcoded value (line 3452)
```typescript
// OLD: includePartialMessages: true,
// NEW:
includePartialMessages: session.sessionConfig.enablePartialMessagesValueId === "enabled",
```

#### 7. Add runtime update handler in `setSessionConfigOption()`
Handle toggling this value at runtime

---

## Feature #2: Beta Features Support

### Current State
- No beta features support at all

### Changes Needed

#### 1. Add to `SessionConfigState` (line 193)
```typescript
type SessionConfigState = {
  // ... existing
  betasValueId: CustomStateValueId;  // ADD THIS
}
```

#### 2. Add to `SESSION_CONFIG_IDS` (line 332)
```typescript
const SESSION_CONFIG_IDS = {
  // ... existing
  betas: "betas",  // ADD THIS
} as const;
```

#### 3. Add to `NewSessionMeta.sessionConfig` (line 258)
```typescript
sessionConfig?: {
  // ... existing
  betas?: string[];  // ADD THIS - e.g., ["context-1m-2025-08-07"]
}
```

#### 4. Add to `getSessionConfigOptions()` (line 976)
```typescript
{
  id: SESSION_CONFIG_IDS.betas,
  type: "select",
  name: "Beta Features",
  category: "_claude_betas",
  description: "Enable experimental SDK beta features. Creation-time only.",
  currentValue: session.sessionConfig.betasValueId,
  options: CUSTOM_STATE_OPTIONS,
}
```

#### 5. Initialize in `newSession()`
```typescript
betasValueId: params._meta?.claudeCode?.sessionConfig?.betas ? "custom" : "default"
```

#### 6. Pass to SDK `query()` call (around line 3440)
```typescript
const options: Options = {
  // ... existing
  betas: params._meta?.claudeCode?.sessionConfig?.betas,  // ADD THIS
}
```

---

## Feature #3: Custom System Prompts

### Current State
- Lines 3260-3270: Partial implementation via `_meta.systemPrompt`
- Not exposed as session config option

### Changes Needed

#### 1. Add to `SessionConfigState` (line 193)
```typescript
type SessionConfigState = {
  // ... existing
  systemPromptValueId: CustomStateValueId;  // ADD THIS
}
```

#### 2. Add to `SESSION_CONFIG_IDS` (line 332)
```typescript
const SESSION_CONFIG_IDS = {
  // ... existing
  systemPrompt: "system_prompt",  // ADD THIS
} as const;
```

#### 3. Add to `NewSessionMeta.sessionConfig` (line 258)
```typescript
sessionConfig?: {
  // ... existing
  systemPrompt?: Options["systemPrompt"];  // ADD THIS
}
```

#### 4. Add to `getSessionConfigOptions()` (line 976)
```typescript
{
  id: SESSION_CONFIG_IDS.systemPrompt,
  type: "select",
  name: "System Prompt",
  category: "_claude_system_prompt",
  description: "Custom system prompt configuration. Creation-time only.",
  currentValue: session.sessionConfig.systemPromptValueId,
  options: CUSTOM_STATE_OPTIONS,
}
```

#### 5. Update system prompt logic (lines 3260-3270)
```typescript
// Priority: sessionConfig > _meta.systemPrompt > default
let systemPrompt: Options["systemPrompt"] = { type: "preset", preset: "claude_code" };

if (params._meta?.claudeCode?.sessionConfig?.systemPrompt) {
  systemPrompt = params._meta.claudeCode.sessionConfig.systemPrompt;
} else if (params._meta?.systemPrompt) {
  // Legacy support
  const customPrompt = params._meta.systemPrompt;
  if (typeof customPrompt === "string") {
    systemPrompt = customPrompt;
  } else if (typeof customPrompt === "object") {
    systemPrompt = { type: "preset", preset: "claude_code" };
    if (customPrompt.append) {
      systemPrompt.append = customPrompt.append;
    }
  }
}
```

#### 6. Initialize in `newSession()`
```typescript
systemPromptValueId: params._meta?.claudeCode?.sessionConfig?.systemPrompt ? "custom" : "default"
```

---

## Implementation Order

1. **First Pass:** Type definitions and constants
   - Update `SessionConfigState`
   - Update `SESSION_CONFIG_IDS`
   - Update `NewSessionMeta`

2. **Second Pass:** Session config UI
   - Update `getSessionConfigOptions()`

3. **Third Pass:** Session initialization
   - Update `newSession()` to initialize new fields

4. **Fourth Pass:** Runtime behavior
   - Update SDK `query()` call to use config values
   - Add runtime update handlers

5. **Fifth Pass:** Testing
   - Write tests for each feature

---

## Files to Modify

1. `src/acp-agent.ts` - Main implementation
2. `src/tests/session-config.test.ts` - Add tests

---

## Backward Compatibility

All changes are backward compatible:
- New fields have sensible defaults
- Existing sessions continue to work
- Optional parameters in `NewSessionMeta`

---

## Next Steps

Start with Feature #1 (Streaming Partial Messages) as it's the simplest and most critical.
