---
name: ui-ux-composition
description: Governed UI/UX composition branch for layout, hierarchy, typography, spacing, responsiveness, and UX clarity.
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

# UI/UX Composition

## Trigger

Use this skill when a request needs a bounded design-intelligence branch that can generate, audit, refine, normalize, or tokenize interface composition without taking product or technical authority.

## When Not To Use

- Do not use for product logic, business rule changes, or technical execution authority.
- Do not use when the task requires native screenshot interpretation, DOM-runtime assertions, or computed-style truth claims.
- Do not use when the input is only a vague aesthetic request with no structure, content, or constraints.

## Workflow

1. Identify the branch mode, artifact type, product context, and available structure.
2. Apply the override order: usability, accessibility, clarity, information hierarchy, responsive integrity, system consistency, proportional harmony, aesthetic refinement.
3. Route through the branch taxonomy only as an advisory internal structure, not as executable subskills.
4. Emit the requested branch artifact with stable required fields and any result-type-specific optional fields.
5. Mark unsupported visual-runtime claims as missing rather than inferred.

## Tool Requirements

- `repo-structure-scanner`
- `spec-compliance-checker`

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

- `branch`
- `mode`
- `result_type`
- `summary`
- `constraints_applied`
- `confidence`
- `findings`
- `recommendations`
- `review_report`
- `layout_blueprint`
- `token_pack`
- `refinement_plan`
- `next_actions`

## Quality Checks

- `audit` in v1 is descriptive, structural, token, and text-based only.
- Do not claim native screenshot, DOM-runtime, or computed-style truth.
- Keep the branch output narrow enough to remain testable and versionable.
- Treat visual analysis as valid only when it is already present as structured description input.
