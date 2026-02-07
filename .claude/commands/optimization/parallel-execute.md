# parallel-execute

Execute tasks in parallel for maximum efficiency.

## Usage
```bash
claude-flow optimization parallel-execute [options]
```

## Options
- `--tasks <file>` - Task list file
- `--max-parallel <n>` - Maximum parallel tasks
- `--strategy <type>` - Execution strategy

## Examples
```bash
# Execute task list
claude-flow optimization parallel-execute --tasks tasks.json

# Limit parallelism
claude-flow optimization parallel-execute --tasks tasks.json --max-parallel 5

# Custom strategy
claude-flow optimization parallel-execute --strategy adaptive
```
