# Full Engineering Workflow — V2

Use for MEDIUM/HIGH/CRITICAL work or whenever multiple skills are activated.

1. DISCOVER — inspect project structure, configuration, entry points, relevant files, tools, tests, and runtime surfaces.
2. UNDERSTAND — reconstruct purpose, roles, data flow, dependencies, important workflows, and constraints from evidence.
3. ROUTE — classify task and activate relevant skills; re-route when evidence changes.
4. PLAN — define the smallest coherent implementation or investigation plan, including verification criteria.
5. EXECUTE — make targeted changes; preserve unrelated behavior.
6. VERIFY — run the strongest practical checks: tests, typecheck, lint, build, runtime, browser/device, API, or security checks as appropriate.
7. DIAGNOSE — if verification fails, capture the exact failure and localize the root cause.
8. REPAIR — correct the root cause, not merely the symptom; avoid silencing errors.
9. RE-VERIFY — repeat relevant checks and regression checks until the result is verified or genuinely blocked.
10. REVIEW — perform a final scope, correctness, security, and simplification sanity check appropriate to the task.
11. REPORT — state findings, changes, evidence, verification status, and remaining risks accurately.

### Verification gate
Do not mark the task complete while a relevant failed verification remains unexplained, unless the environment makes further verification impossible. In that case report BLOCKED/UNVERIFIED and the exact reason.
