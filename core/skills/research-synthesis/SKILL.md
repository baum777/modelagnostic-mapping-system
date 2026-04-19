---
name: research-synthesis
description: Combine explicit sources into a bounded synthesis without overstating certainty.
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

# Research Synthesis

## Trigger

Use this skill when you need a decision-ready synthesis from several explicit sources.

## When Not To Use

- Do not use when the question is already answered by a canonical contract.
- Do not use to mask missing evidence.
- Do not use to create a recommendation without source grounding.

## Workflow

1. Collect the explicit sources.
2. Distinguish direct evidence from synthesis.
3. Compare the sources for agreement and conflict.
4. State uncertainty and open questions.
5. Return a concise synthesis with citations.

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

- `SUMMARY`
- `SOURCES`
- `SYNTHESIS`
- `OPEN QUESTIONS`
- `RISKS`
- `NEXT ACTIONS`

## Quality Checks

- do not flatten disagreement into consensus
- label inference as inference
- preserve traceability to the source files
