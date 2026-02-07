# pr-enhance

AI-powered pull request enhancements.

## Usage
```bash
claude-flow github pr-enhance [options]
```

## Options
- `--pr-number <n>` - Pull request number
- `--add-tests` - Add missing tests
- `--improve-docs` - Improve documentation
- `--check-security` - Security review

## Examples
```bash
# Enhance PR
claude-flow github pr-enhance --pr-number 123

# Add tests
claude-flow github pr-enhance --pr-number 123 --add-tests

# Full enhancement
claude-flow github pr-enhance --pr-number 123 --add-tests --improve-docs
```
