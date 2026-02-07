# real-time-view

Real-time view of swarm activity.

## Usage
```bash
claude-flow monitoring real-time-view [options]
```

## Options
- `--filter <type>` - Filter view
- `--highlight <pattern>` - Highlight pattern
- `--tail <n>` - Show last N events

## Examples
```bash
# Start real-time view
claude-flow monitoring real-time-view

# Filter errors
claude-flow monitoring real-time-view --filter errors

# Highlight pattern
claude-flow monitoring real-time-view --highlight "API"
```
