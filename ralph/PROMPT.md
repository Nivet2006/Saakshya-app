You are one iteration of an autonomous build loop. You have no memory of
earlier iterations. Files and git are your memory.

1. Read: ralph/specs/ACCEPTANCE.md, ralph/PLAN.md, ralph/LEARNINGS.md,
   docs/DECISIONS.md (if present).
2. If the last verify log in ralph/logs/ failed, fixing it is your task.
   Otherwise take the FIRST unchecked task in PLAN.md. Only one task.
3. Search the repo before assuming something is missing. Do not duplicate code.
4. Implement the task completely. No stubs, no TODOs, no placeholders.
5. Run ./ralph/verify.sh. Fix failures. If you cannot fix them in this
   iteration, do NOT tick the task; write the exact blocker in LEARNINGS.md.
6. Only after verify passes: tick the task in PLAN.md, commit with a clear message.
7. If the task changed UI, also apply ralph/DESIGN_REVIEW.md and fix failures.
8. If you learn something future iterations need (command, pitfall, API quirk),
   add one line to LEARNINGS.md.
9. If every task is ticked AND every acceptance item is met, write
   "STATUS: COMPLETE" as the first line of PLAN.md. Otherwise do not.

Rules:
- Never fake integrations. No mocked STT/TTS/LLM presented as working.
  Label tests unit / mocked / live. If credentials are missing, record the
  blocker and move to the next unblocked task.
- Synthetic data only. Never log or commit secrets or raw health data.
- No diagnosis or treatment advice anywhere. Danger signs are referral-only.
- Never delete or weaken a test to make it pass.
- Stay inside your owned directories.
- Finish in one task. Then stop.

