---
name: repo-audit
description: Audit repository truth, boundary surfaces, and migration readiness from explicit evidence.
version: 1.0.0
classification: shared-with-local-inputs
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

# Repo Audit

## Trigger

Use this skill when you need a governed repository audit before or after a migration slice.

## When Not To Use

- Do not use for a narrow single-file fix.
- Do not use when the repository truth is already fully captured by an existing audit artifact.
- Do not use to infer hidden state that is not represented by repo evidence.

## Workflow

1. Inspect the repository structure and declared canonical sources.
2. Separate observed state from inferred state.
3. Map core, provider, tool, eval, and overlay boundaries.
4. Identify gaps, drift, and compatibility surfaces.
5. Return a bounded report with exact file paths.

## Tool Requirements

- `repo-structure-scanner`
- `git-diff-explainer`
- `spec-compliance-checker`
- `validate-repo-surface`

## Local Inputs

- repository root
- any consumer-supplied overlay or contract paths that scope the audit

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
- `OBSERVED STATE`
- `CANONICAL SOURCES`
- `GAPS`
- `RISKS`
- `NEXT ACTIONS`

## Quality Checks

- cite exact file paths
- label inferred claims as inferred
- fail closed on missing evidence
