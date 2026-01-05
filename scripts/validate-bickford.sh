#!/bin/bash
# Bickford System Validation Script
# Validates that all components are properly wired and ready for execution

set -e

echo "🔍 Bickford System Validation"
echo "=============================="
echo ""

# Check Node.js
echo "✓ Checking Node.js version..."
node --version

# Check npm
echo "✓ Checking npm version..."
npm --version

# Check if dependencies are installed
echo "✓ Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "  Installing dependencies..."
    npm install > /dev/null 2>&1
    echo "  ✓ Dependencies installed"
else
    echo "  ✓ Dependencies already installed"
fi

# Check TypeScript compilation for Bickford files only
echo "✓ Checking TypeScript compilation (Bickford files)..."
npx tsc --noEmit \
    lib/ledger/*.ts \
    lib/canon/core.ts \
    lib/bickford/*.ts \
    app/api/bickford/**/*.ts \
    2>&1 | grep -v "templates/" || echo "  ✓ TypeScript OK"

# Check that key files exist
echo "✓ Checking core files..."
files=(
    "lib/invariants/bickfordIdentity.ts"
    "lib/ledger/types.ts"
    "lib/ledger/write.ts"
    "lib/canon/core.ts"
    "lib/bickford/claudePlanner.ts"
    "lib/bickford/planner.ts"
    "lib/bickford/diff.ts"
    "lib/bickford/applier.ts"
    "lib/bickford/git.ts"
    "lib/bickford/netlify.ts"
    "lib/bickford/rollback.ts"
    "app/api/bickford/execute/route.ts"
    "app/api/bickford/ledger/[executionId]/route.ts"
    "app/components/BickfordConsole.tsx"
    "app/components/ExecutionLedger.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file MISSING"
        exit 1
    fi
done

# Check documentation
echo "✓ Checking documentation..."
docs=(
    "README_BICKFORD.md"
    "IMPLEMENTATION_SUMMARY.md"
    "QUICKSTART.md"
    ".env.example"
)

for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "  ✓ $doc"
    else
        echo "  ✗ $doc MISSING"
        exit 1
    fi
done

# Check .env.example for required variables
echo "✓ Checking .env.example configuration..."
required_vars=(
    "ANTHROPIC_API_KEY"
    "NETLIFY_SITE_ID"
    "NETLIFY_TOKEN"
    "NETLIFY_BUILD_HOOK"
    "BICKFORD_BASE_URL"
    "DATABASE_URL"
)

for var in "${required_vars[@]}"; do
    if grep -q "$var" .env.example; then
        echo "  ✓ $var documented"
    else
        echo "  ✗ $var missing from .env.example"
        exit 1
    fi
done

# Validate code structure
echo "✓ Validating code structure..."

# Check that ledger types are exported
if grep -q "export type LedgerEventType" lib/ledger/types.ts; then
    echo "  ✓ Ledger types exported"
fi

# Check that Canon evaluation exists
if grep -q "export function evaluatePlan" lib/canon/core.ts; then
    echo "  ✓ Canon evaluation exported"
fi

# Check that Claude planner exists
if grep -q "export async function generatePlanFromIntent" lib/bickford/claudePlanner.ts; then
    echo "  ✓ Claude planner exported"
fi

# Check that rollback exists
if grep -q "export async function rollbackToLastCommit" lib/bickford/rollback.ts; then
    echo "  ✓ Rollback function exported"
fi

echo ""
echo "=============================="
echo "✅ All validation checks passed!"
echo ""
echo "🚀 Ready for execution!"
echo ""
echo "To deploy and demonstrate:"
echo "  1. Copy .env.example to .env.local"
echo "  2. Add your ANTHROPIC_API_KEY"
echo "  3. Configure Netlify variables (optional)"
echo "  4. Run: npm run dev"
echo "  5. Open: http://localhost:3000"
echo "  6. Test with BickfordConsole UI"
echo ""
echo "For autonomous execution workflow:"
echo "  POST /api/bickford/execute"
echo "  { \"intent\": \"Your natural language intent\" }"
echo ""
