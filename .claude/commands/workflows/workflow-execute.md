# workflow-execute

Execute saved workflows.

## Usage
```bash
claude-flow workflow execute [options]
```

## Options
- `--name <name>` - Workflow name
- `--params <json>` - Workflow parameters
- `--dry-run` - Preview execution

## Examples
```bash
# Execute workflow
claude-flow workflow execute --name "deploy-api"

# With parameters
claude-flow workflow execute --name "test-suite" --params '{"env": "staging"}'

# Dry run
claude-flow workflow execute --name "deploy-api" --dry-run
```
