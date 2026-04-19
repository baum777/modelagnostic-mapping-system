---
name: migration-planner
description: Break a repository migration into bounded implementation slices with gates and rollback points.
version: 1.0.0
classification: shared
requires_repo_inputs: false
produces_structured_output: true
safe_to_auto_run: true
owner: model-agnostic-workflow-system
status: extracted
output_contract_path: core/contracts/output-contracts.json
tool_contract_catalog_path: core/contracts/tool-contracts/catalog.json
provider_projection_path: core/contracts/portable-skill-manifest.json
eval_profile_path: evals/catalog.json
---

# Migration Planner

## Trigger

Use this skill when a migration request spans multiple surfaces and needs a deterministic slice plan.

## When Not To Use

- Do not use for a one-line patch.
- Do not use to postpone implementation indefinitely.
- Do not use to hide ambiguity in broad prose.

## Workflow

1. Restate the target architecture in concrete terms.
2. Split the change into bounded slices.
3. Identify dependencies and rollback points.
4. Define acceptance criteria for each slice.
5. Choose the smallest safe first slice.

## Tool Requirements

- `planning-slice-builder`
- `patch-strategy-designer`
- `test-matrix-builder`

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
- `TARGET SHAPE`
- `SLICE PLAN`
- `DEPENDENCIES`
- `ACCEPTANCE CRITERIA`
- `RISKS`
- `NEXT ACTIONS`

## Quality Checks

- every slice must be independently testable
- dependencies must be explicit
- the first slice must be the smallest safe slice
