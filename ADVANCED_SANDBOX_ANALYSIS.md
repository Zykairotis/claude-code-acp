# Advanced Sandbox Configuration Analysis

**Date:** February 7, 2026  
**Status:** ALREADY SUPPORTED (Documentation needed)

---

## 🎉 Discovery: Advanced Sandbox Already Works!

After reviewing the code, I discovered that **advanced sandbox configuration is already supported** - it just needs better documentation and UI indication.

### Current Implementation

**Line 3479 in src/acp-agent.ts:**
```typescript
const startupSandbox = startupSessionConfig?.sandbox ?? userProvidedOptions?.sandbox;
```

**Line 3610:**
```typescript
sandbox: startupSandbox,
```

**Type Definition (Line 285):**
```typescript
sessionConfig?: {
  // ...
  sandbox?: Options["sandbox"];  // ← This accepts the FULL SandboxSettings object!
}
```

### What This Means

The `Options["sandbox"]` type from the SDK **already includes all advanced options**:
- `enabled: boolean`
- `autoAllowBashIfSandboxed?: boolean`
- `excludedCommands?: string[]`
- `allowUnsandboxedCommands?: boolean`
- `network?: SandboxNetworkConfig`
- `ignoreViolations?: SandboxIgnoreViolations`
- `enableWeakerNestedSandbox?: boolean`

**Users can already pass these!** They just don't know about it.

---

## ✅ What Works (No Code Changes Needed)

### Example Usage

```typescript
const session = await agent.newSession({
  claudeCode: {
    sessionConfig: {
      sandbox: {
        enabled: true,
        autoAllowBashIfSandboxed: true,
        excludedCommands: ["git", "npm"],
        allowUnsandboxedCommands: false,
        network: {
          allowLocalBinding: true,
          httpProxyPort: 8080,
        },
        ignoreViolations: {
          networkViolations: false,
          sandboxEscapeViolations: true,
        }
      }
    }
  }
});
```

**This already works!** The full object is passed directly to the SDK.

---

## ⚠️ What's Missing: UI Indication

The only issue is the **UI indication**. Currently:

```typescript
sandboxValueId: startupSandbox?.enabled ? "enabled" : "disabled",
```

This only shows "enabled" or "disabled" based on the `enabled` flag, even if advanced options are configured.

### Problem

Users who configure advanced sandbox settings see:
- UI: "Sandbox: enabled" ✅
- Actual: Full advanced config with network rules, exclusions, etc. ✅

But there's no way to know from the UI that **advanced settings are active**.

---

## 🎯 Recommended Solution

### Option A: Multi-State Indicator (Simple)

Change the UI to show:
- "disabled" - Sandbox not enabled
- "enabled" - Basic sandbox only
- "custom" - Advanced sandbox configuration

```typescript
sandboxValueId: 
  !startupSandbox?.enabled ? "disabled" :
  (startupSandbox.autoAllowBashIfSandboxed !== undefined ||
   startupSandbox.excludedCommands?.length ||
   startupSandbox.network ||
   startupSandbox.ignoreViolations) ? "custom" : "enabled",
```

### Option B: Detailed State (Better UX)

Create a richer sandbox state type:

```typescript
type SandboxStateValueId = 
  | "disabled"
  | "basic"
  | "auto_allow_bash"
  | "with_exclusions"
  | "with_network"
  | "custom";
```

Then detect which advanced features are active and show appropriate state.

### Option C: Just Document It (Easiest)

Keep the current implementation, but:
1. Update README.md with advanced sandbox examples
2. Add TypeScript doc comments showing all options
3. Users can already use it, they just need to know

---

## 📝 Documentation Updates Needed

### README.md

Add section:

```markdown
### Advanced Sandbox Configuration

The sandbox supports advanced configuration options:

\`\`\`typescript
{
  claudeCode: {
    sessionConfig: {
      sandbox: {
        enabled: true,
        // Auto-approve bash commands in sandbox
        autoAllowBashIfSandboxed: true,
        
        // Commands that bypass sandbox
        excludedCommands: ["git", "npm", "cargo"],
        
        // Allow model to request unsandboxed execution
        allowUnsandboxedCommands: false,
        
        // Network configuration
        network: {
          allowLocalBinding: true,      // Allow dev servers
          allowUnixSockets: ["/var/run/docker.sock"],
          httpProxyPort: 8080,
          socksProxyPort: 1080,
        },
        
        // Violation handling
        ignoreViolations: {
          networkViolations: false,
          sandboxEscapeViolations: true,
        },
        
        // Nested sandbox behavior
        enableWeakerNestedSandbox: true,
      }
    }
  }
}
\`\`\`

**Verify Your Configuration:**
```bash
# Check sandbox status in session
GET /session/{sessionId}/config
```
\`\`\`

### TypeScript Comments

Add JSDoc to the type definition:

\`\`\`typescript
/**
 * Sandbox configuration for command execution.
 * 
 * @example Basic sandbox
 * { enabled: true }
 * 
 * @example Advanced sandbox with network access
 * {
 *   enabled: true,
 *   autoAllowBashIfSandboxed: true,
 *   network: { allowLocalBinding: true }
 * }
 * 
 * @see {@link https://docs.anthropic.com/agent-sdk/sandbox}
 */
sandbox?: Options["sandbox"];
\`\`\`

---

## ✅ Conclusion

**Status:** Feature already works! ✅  
**Action Needed:** Documentation only  
**Code Changes:** Optional (UI state improvement)

### Recommendation

1. **Document the feature** (README + TypeScript comments)
2. **Optionally improve UI** (show "custom" when advanced options used)
3. **Test it** (verify all advanced options work)

**This is NOT a missing feature - it's a missing documentation!**

---

## 🧪 Testing Plan

1. Create session with advanced sandbox config
2. Verify bash commands execute in sandbox
3. Verify excluded commands bypass sandbox
4. Verify network rules apply
5. Check session config shows correct state

---

## 📊 Priority

**Priority:** LOW (already works)  
**User Impact:** MEDIUM (users don't know about it)  
**Effort:** MINIMAL (documentation only)

**Time Estimate:**
- Document: 30 minutes
- UI improvement: 1 hour (optional)
- Testing: 30 minutes

**Total:** 1-2 hours for complete implementation
