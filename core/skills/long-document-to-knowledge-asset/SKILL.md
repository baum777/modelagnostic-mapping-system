---
name: long-document-to-knowledge-asset
description: Turn a long document into a traceable knowledge asset without losing provenance or unresolved gaps.
version: 1.0.0
classification: shared
requires_repo_inputs: false
produces_structured_output: true
safe_to_auto_run: true
owner: codex-workflow-core
status: extracted
output_contract_path: core/contracts/output-contracts.json
tool_contract_catalog_path: core/contracts/tool-contracts/catalog.json
provider_projection_path: core/contracts/portable-skill-manifest.json
eval_profile_path: evals/catalog.json
---

# Long Document To Knowledge Asset

## Trigger

Use this skill when a long source document needs to become a smaller, traceable knowledge asset.

## When Not To Use

- Do not use when the source is already a compact canonical contract.
- Do not use to remove provenance.
- Do not use to invent missing content.

## Workflow

1. Map the document structure.
2. Extract the stable claims and sections.
3. Separate derived notes from direct source text.
4. Preserve traceability to the source document.
5. Return a bounded knowledge asset with gaps called out.

## Tool Requirements

- `spec-compliance-checker`
- `repo-structure-scanner`

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
- `DOCUMENT MAP`
- `DERIVED ASSETS`
- `TRACEABILITY`
- `GAPS`
- `NEXT ACTIONS`

## Quality Checks

- preserve provenance
- do not drop unresolved ambiguities
- distinguish quoted source structure from derived synthesis

