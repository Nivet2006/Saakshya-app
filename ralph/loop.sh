#!/usr/bin/env bash
# Usage: ./ralph/loop.sh [max_iterations]
# Run inside a sandbox, container or throwaway branch: it skips permission prompts.
set -u
MAX=${1:-40}
STUCK_LIMIT=3
git checkout -B ralph/run >/dev/null 2>&1
mkdir -p ralph/logs
last_hash=""; stuck=0

for i in $(seq 1 "$MAX"); do
  echo "=== Iteration $i / $MAX  $(date +%H:%M:%S) ==="
  cat ralph/PROMPT.md | claude -p --dangerously-skip-permissions \
      > "ralph/logs/iter_$i.log" 2>&1

  # Independent gate: the loop runs the tests itself, not trusting the agent
  if ./ralph/verify.sh > "ralph/logs/verify_$i.log" 2>&1; then
    echo "verify: PASS"
  else
    echo "verify: FAIL (see ralph/logs/verify_$i.log)"
    echo "- iter $i: verify.sh failed, fix before new work" >> ralph/LEARNINGS.md
  fi

  # Done?
  if grep -q "^STATUS: COMPLETE" ralph/PLAN.md; then
    echo "All tasks complete."; exit 0
  fi

  # Stuck detection: no change in plan or code for N iterations
  h=$(git rev-parse HEAD)$(git status --porcelain | shasum)
  if [ "$h" = "$last_hash" ]; then stuck=$((stuck+1)); else stuck=0; fi
  last_hash=$h
  if [ "$stuck" -ge "$STUCK_LIMIT" ]; then
    echo "STUCK: no progress for $STUCK_LIMIT iterations. Read ralph/LEARNINGS.md."
    exit 2
  fi
done
echo "Max iterations reached."

