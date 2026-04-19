---
name: readiness-check
description: Determine whether a repo slice is ready for the next gate using explicit evidence and fail-closed checks.
version: 1.0.0
classification: shared
requires_repo_inputs: true
produces_structured_output: true
safe_to_auto_run: true
owner: model-agnostic-workflow-system
status: extracted
output_contract_path: core/contracts/output-contracts.json
tool_contract_catalog_path: core/contracts/tool-contracts/catalog.json
provider_projection_path: core/contracts/portable-skill-manifest.json
eval_profile_path: evals/catalog.json
---

# Readiness Check

## Trigger

Use this skill when you need a bounded readiness verdict before merge, export, rollout, or publication.

## When Not To Use

- Do not use for general exploration.
- Do not use when the question is about long-term architecture rather than an immediate gate.
- Do not use to claim live readiness without evidence.

## Workflow

1. Inspect the declared gates and required surfaces.
2. Verify the current truth against the requested gate.
3. Separate verified blockers from advisory notes.
4. Return a fail-closed verdict when evidence is missing.
5. Name the next gate explicitly.

## Tool Requirements

- `validate-repo-surface`
- `validate-provider-neutral-core`
- `validate-shared-core-scaffold`
- `run-certification-evals`

## Approval Mode

- read-only

## Provider Projections

- OpenAI/Codex: native
- Claude: adapter
- Qwen Code: adapter
- Kimi K2.5: adapter

## Eval Scaffolding

- routing
- schema conformance
- tool selection
- approval boundary
- provider parity
- failure modes

## Output

- `SUMMARY`
- `CURRENT TRUTH`
- `GATES`
- `BLOCKERS`
- `DECISION`
- `NEXT ACTIONS`

## Quality Checks

- do not conflate advisory and blocking states
- fail closed when inputs are missing
- keep the decision compact and evidence-based
