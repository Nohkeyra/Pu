# Skill Pack V2 Manifest

## Core
- core/UNIVERSAL.md — universal behavior and evidence discipline
- core/TASK-ROUTER.md — automatic skill selection and re-routing

## Skills
- skills/code-audit.md — system/code review and root-cause findings
- skills/debugging.md — evidence-driven failure diagnosis and repair
- skills/security-review.md — security-focused review and attack-path analysis
- skills/simplification.md — targeted cleanup, duplication, complexity, and efficiency review
- skills/verification.md — verification strategy and truthful PASS/FAIL/BLOCKED reporting
- skills/orchestration.md — coordination and dependency management

## Workflow
- workflows/full-engineering.md — orchestrates complex multi-step engineering work

## Adapters
- adapters/chatgpt.md
- adapters/claude.md
- adapters/gemini.md

## Activation model
The pack is not a flat prompt and not a requirement to load every skill every time. The router selects the minimum sufficient set from the manifest, activates dependencies, and can re-route when new evidence appears.
