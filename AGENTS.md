# AGENTS.md – Structured Development Task Directive

**Document Version:** 1.0  **Status:** Open

This document is a living task plan for the Eternal Momentum VR project.  It replaces the previous ad‑hoc task list with a structured, sequential workflow designed for OpenAI Codex.  Each task is written to provide **complete context**, explicit **implementation steps**, and **acceptance criteria**.  After finishing a task, you **must** update `TASK_LOG.md` with a summary of what was done, any deviations from the plan and the next step you intend to tackle.  This creates an audit trail for future agents.

## How to Use This Document

1. **Read the Original Code** – For each mechanic or boss, open the corresponding file under `Eternal‑Momentum‑OLD GAME/` (e.g. `modules/bosses.js`, `modules/powers.js`).  Understand the behaviour completely before writing any VR code.  When in doubt, run the original game.
2. **Follow the Steps** – Each task below contains a *Problem Description*, a series of *Implementation Steps* and an *Acceptance Criteria*.  Execute the steps in order.  If you encounter a blocker, record it in `TASK_LOG.md` and seek clarification.
3. **Self‑Verification** – After implementing, run the unit tests and manual checks described in the acceptance criteria.  Only when those checks pass should you mark the task as complete in `TASK_LOG.md`.
4. **Leave Notes** – At the end of each task, append to `TASK_LOG.md` a note with the following structure:

