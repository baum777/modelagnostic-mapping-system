---
name: runtime-policy-auditor
description: Audit declared runtime policy, control surfaces, kill switches, and fail-closed boundaries using consumer-local inputs.
version: 1.0.0
classification: shared-with-local-inputs
requires_repo_inputs: true
produces_structured_output: true
safe_to_auto_run: true
owner: model-agnostic-workflow-system
status: extracted
input_contract_path: .codex/runtime-policy-inputs.json
---

# Runtime Policy Auditor

## Trigger

Use this skill when you need to audit runtime policy, control boundaries, or fail-closed posture in a consumer repo that has supplied its local runtime-policy contract.

## When Not To Use

- Do not use for live-readiness decisions.
- Do not use for capital-risk or production-promotion judgments.
- Do not use when the consumer repo has not supplied `.codex/runtime-policy-inputs.json`.
- Do not use to infer hidden runtime truth outside the declared local inputs.

## Workflow

1. Read `.codex/runtime-policy-inputs.json` first.
2. Read the declared runtime policy docs, config files, control surfaces, kill-switch files, approval boundaries, posture definitions, and status surfaces.
3. Identify what the repo explicitly allows, blocks, pauses, or fails closed.
4. Call out ambiguities, missing gates, and drift between policy docs and runtime surfaces.
5. Separate policy semantics from implementation behavior.
6. Produce a bounded audit that cites only the declared local inputs.
7. Validate the local input contract with `npm run validate-runtime-policy-input-contract -- --contract .codex/runtime-policy-inputs.json` when needed.

## Local Inputs

- Required local input file: `.codex/runtime-policy-inputs.json`
- Use only the repo-local paths declared in that file for runtime policy docs, runtime config files, control surfaces, kill-switch files, approval boundaries, posture definitions, health/status surfaces, and optional env references.
- Do not infer policy scope or readiness beyond the declared contract.

## Non-Goals

- This skill does not decide whether a system is ready for live execution.
- This skill does not replace the paper-to-live-readiness reviewer.
- This skill does not infer operational safety from runtime policy alone.
- This skill does not authorize trade, deployment, or capital decisions.

## Output

Use these headings:

- `SUMMARY`
- `POLICY SURFACES`
- `CONTROL SURFACES`
- `KILL SWITCH / STOP CONDITIONS`
- `APPROVAL BOUNDARIES`
- `MODE / POSTURE SEMANTICS`
- `FAIL-CLOSED EXPECTATIONS`
- `GAPS / AMBIGUITIES`
- `NON-GOALS`
- `NEXT ACTIONS`

## Quality Checks

- Call out missing or ambiguous kill switches explicitly.
- Keep policy and readiness separate.
- Prefer declared file evidence over inference.
- Note when a surface exists but is not exercised.
- Confirm the local input contract is valid before trusting the audit.

## References

- `docs/shared-with-local-inputs.md`
- `docs/runtime-policy-skill-contract.md`
- `docs/overview.md`
- `docs/architecture.md`
- `scripts/tools/validate-runtime-policy-input-contract.mjs`
- `templates/codex-workflow/review-summary-template.md`
- `examples/codex-workflow/review-summary-example.md`
