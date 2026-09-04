# SKILL: DEBUGGING

Purpose: diagnose and repair actual failures.

Workflow:
1. Capture the exact error or incorrect behavior.
2. Reproduce when practical.
3. Trace from symptom to responsible boundary.
4. Form a falsifiable hypothesis.
5. Test the hypothesis with the narrowest useful check.
6. Fix the root cause.
7. Reproduce the original scenario.
8. Run regression checks on affected behavior.

Rules:
- Never guess the root cause from the error message alone.
- Do not silence errors to obtain a green result.
- Do not rewrite large areas before localization.
