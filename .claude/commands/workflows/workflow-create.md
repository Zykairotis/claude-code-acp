# workflow-create

Create reusable workflow templates.

## Usage
```bash
claude-flow workflow create [options]
```

## Options
- `--name <name>` - Workflow name
- `--from-history` - Create from history
- `--interactive` - Interactive creation

## Examples
```bash
# Create workflow
claude-flow workflow create --name "deploy-api"

# From history
claude-flow workflow create --name "test-suite" --from-history

# Interactive mode
claude-flow workflow create --interactive
```
