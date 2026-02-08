#!/bin/bash
# Live Context Clearing Validation Runner
# 
# This script runs live validation tests against the Claude API
# to verify that context clearing truly works.

set -e

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║              🧪 Live Context Clearing Validation Test 🧪                     ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ERROR: ANTHROPIC_API_KEY environment variable not set"
    echo ""
    echo "Please set your API key:"
    echo "  export ANTHROPIC_API_KEY='your_key_here'"
    echo ""
    echo "Or run this script with the key:"
    echo "  ANTHROPIC_API_KEY='your_key' bash RUN_LIVE_VALIDATION.sh"
    echo ""
    exit 1
fi

echo "✅ API Key found"
echo "🔧 Building project..."
npm run build

echo ""
echo "🧪 Running live validation tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the live tests
npm run test -- src/tests/live-context-clearing.test.ts --reporter=verbose

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Live validation complete!"
echo ""
echo "📊 Please review the output above to verify:"
echo "   1. Claude remembered the secret code initially"
echo "   2. Context persisted in second message"
echo "   3. Context cleared successfully"
echo "   4. Claude did NOT remember code after clearing"
echo ""
echo "If all checks passed, context clearing is WORKING! 🎉"
echo ""
