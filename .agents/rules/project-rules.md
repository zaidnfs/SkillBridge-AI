# SkillBridge AI — Master Project Rule

## MANDATORY: Read Before Any Work

Before writing any code, modifying any file, or making any technical decision on this project, you **MUST** read and follow the instructions in the `Docs/` folder. This is non-negotiable.

---

## Required Reading Order

Before every task, read these files in this order:

1. **`Docs/PRD.md`** — Understand WHAT we are building and WHY. Do not implement features outside the PRD scope.
2. **`Docs/ARCHITECTURE.md`** — Understand HOW the system is structured. Follow the folder structure, tech stack, layer boundaries, and graph schema defined here.
3. **`Docs/DESIGN.md`** — Follow the visual design system for ALL UI work. Use the defined colors, typography, spacing, components, and UX requirements. Do not invent your own styles.
4. **`Docs/RULES.md`** — Follow ALL development rules. This is your coding rulebook — Python standards, Django patterns, security practices, testing requirements, and git workflow.
5. **`Docs/TASK.md`** — Check which task you are working on. Implement only the current task. Do not skip ahead or combine multiple tasks.
6. **`Docs/MEMORY.md`** — Check the current project state before starting. Know what is completed, what is in progress, and what the known issues are.
7. **`Docs/DECISIONS.md`** — Respect all recorded architectural decisions. Do not reverse or contradict a decision without creating a new ADR.
8. **`Docs/SECURITY.md`** — Follow ALL security requirements. Security is built-in, not bolted on.
9. **`Docs/TEST_PLAN.md`** — Know what tests are expected for the feature you are building. Write tests as defined here.

---

## Core Principles

### 1. One Task at a Time
Work on exactly one task from `TASK.md` at a time. Follow the workflow:
```
Understand → Plan → Implement → Test → Security Audit (/security-audit) → Review → Commit → Update Docs
```

### 2. Do Not Deviate from Architecture
The system architecture is defined in `ARCHITECTURE.md`. Do not:
- Add new databases or services not in the architecture.
- Put business logic in views.
- Put database queries in UI components.
- Bypass the service layer.
- Hardcode LLM prompts in Python functions.

### 3. Do Not Deviate from Design
The visual system is defined in `DESIGN.md`. Do not:
- Use colors not in the palette.
- Use fonts not in the typography spec.
- Skip loading, empty, or error states.
- Ignore responsive breakpoints.

### 4. Do Not Skip Testing
Every feature must have tests as specified in `TEST_PLAN.md`. Do not:
- Mark a task complete without tests.
- Disable or skip tests without documenting why.
- Deploy without running the test suite.

### 5. Mandatory Post-Task Security Audit (`/security-audit`)
As soon as implementation and testing are finished for any task, you **MUST** run a `/security-audit` review on all touched files:
- Inspect newly written code against injection (SQL, Cypher, prompt injection), missing auth/object permissions (IDOR), secret leaks, and data exposure.
- Remediate and eliminate any identified risk or security issue immediately.
- Do not mark the task complete or commit until all security findings are resolved.

### 6. Keep Documentation Current
After completing a task:
- Update `TASK.md` — mark the task as complete.
- Update `MEMORY.md` — reflect the new project state and record security audit verification.
- Update `ARCHITECTURE.md` if you added new services, models, or integrations.
- Update `DECISIONS.md` if you made a significant technical choice.

### 7. Security Is Non-Negotiable
Follow `SECURITY.md` and `.agents/rules/security-audit.md` at all times:
- Never commit secrets.
- Always validate input server-side.
- Always check authorization on user-owned resources.
- Always sanitize LLM outputs before display.
- Run `/security-audit` immediately after every task.

---

## Vibe Coding Methodology

This project follows the **Vibe Coding** methodology documented in `Docs/VIBE_CODING_GUIDE.md`. The key principles are:

1. **Research before coding.** Understand the problem and existing solutions.
2. **Document before building.** PRD, Architecture, Design, Rules — all come before code.
3. **Build in vertical slices.** Complete user flows, not isolated layers.
4. **Use structured prompts.** Context, Task, Files, Constraints, Acceptance Criteria, Testing.
5. **Small tasks, small commits.** One task = one logical unit of work.
6. **Test every feature.** Lint, type check, unit tests, integration tests.
7. **Perform security audit.** Check `/security-audit` and eliminate risks as soon as testing passes.
8. **Review before committing.** Check against PRD, Architecture, Design, Rules.
9. **Update documentation continuously.** Docs describe the current project, not a past version.

---

## File Reference

| File | Location | Purpose |
|---|---|---|
| `PRD.md` | `Docs/PRD.md` | Product requirements — what and why |
| `ARCHITECTURE.md` | `Docs/ARCHITECTURE.md` | System architecture — how it works |
| `DESIGN.md` | `Docs/DESIGN.md` | Visual design system — how it looks |
| `RULES.md` | `Docs/RULES.md` | Development rules — how to code |
| `TASK.md` | `Docs/TASK.md` | Task breakdown — what to build next |
| `MEMORY.md` | `Docs/MEMORY.md` | Project state — where we are |
| `DECISIONS.md` | `Docs/DECISIONS.md` | Architecture decisions — why we chose this |
| `SECURITY.md` | `Docs/SECURITY.md` | Security requirements — how to protect |
| `TEST_PLAN.md` | `Docs/TEST_PLAN.md` | Testing plan — how to verify |
| `VIBE_CODING_GUIDE.md` | `Docs/VIBE_CODING_GUIDE.md` | Methodology reference |
| `PROJECT_SYNOPSIS.md` | `Docs/PROJECT_SYNOPSIS.md` | Academic synopsis |
