# Portable AI Skill Pack V2

A model-agnostic engineering methodology designed to be uploaded to capable AI assistants and used as supplementary operating guidance.

## What changed in V2
- Automatic task classification and skill routing
- Complexity-aware orchestration
- Skill dependency handling
- Dynamic re-routing when new evidence appears
- Mandatory verification gate for substantive work
- Clearer separation between core behavior, skills, workflow, and model adapters
- Explicit manifest so an AI can discover the pack deterministically

## Operating model
DISCOVER → UNDERSTAND → ROUTE → PLAN → EXECUTE → VERIFY → DIAGNOSE → REPAIR → RE-VERIFY → REVIEW → REPORT

The pack does not attempt to override system/developer/safety instructions or reproduce hidden vendor prompts. It externalizes reusable engineering behavior in a portable form.

## Recommended use
Upload the ZIP, then provide the task normally. The AI should inspect this pack, route itself to the relevant skills, execute the work, and verify the outcome.
