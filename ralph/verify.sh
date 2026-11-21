#!/usr/bin/env bash
set -euo pipefail
fail=0
run(){ echo ">> $1"; shift; "$@" || { echo "FAILED: $*"; fail=1; }; }

# 1. Secrets and PII guard (always on)
if git ls-files | grep -E '(^|/)\.env(\.local)?$'; then
  echo "FAILED: .env file is tracked in git"
  fail=1
fi
if git grep -nEI '(AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{30,}|SUPABASE_SERVICE_ROLE_KEY=eyJ)' -- . ':!ralph/*' 2>/dev/null; then
  echo "FAILED: possible API key or secret in repo"
  fail=1
fi

# 2. Mobile TypeScript, ESLint, and Unit/Contract Tests
if [ -f package.json ]; then
  run "typecheck" npm run typecheck
  run "lint" npm run lint
  run "unit tests" npm test -- --watchAll=false
else
  echo "FAILED: package.json missing"
  fail=1
fi

exit $fail
