# Shared Core Overview

Class: derived.
Use rule: read as a summary only; do not use it to decide authority or enforcement status.

This page is a summary only. For canonical authority, read [docs/architecture.md](C:/workspace/main_projects/codex-workflow-core/docs/architecture.md) and [docs/authority-matrix.md](C:/workspace/main_projects/codex-workflow-core/docs/authority-matrix.md); for operator flow, read [docs/usage.md](C:/workspace/main_projects/codex-workflow-core/docs/usage.md).

## Scope

This shared core is limited to reusable workflow assets:

- portable core skills under `core/skills/`
- normalized output contracts under `core/contracts/output-contracts.json`
- normalized tool contracts under `core/contracts/tool-contracts/catalog.json`
- canonical provider capabilities under `core/contracts/provider-capabilities.json`
- planning and review skills
- generic templates
- generic examples
- generic helper scripts
- shared validation expectations
- parameterized skills that rely on explicit consumer-local input contracts
- a neutral core registry and provider capability matrix under `contracts/`
- provider adapter scaffolds under `providers/`

## Boundary

The shared core does not own repo-specific governance, evidence logs, or runtime assumptions.
Consumer repositories must supply those through a local overlay.
- This is a logical class label only; there is no physical derived-docs directory in the current repo layout.

## Current Slice

- `repo-intake-sot-mapper`
- `runtime-policy-auditor`
- `repo-audit`
- `readiness-check`
- `migration-planner`
- `research-synthesis`
- `long-document-to-knowledge-asset`
- `qwen-3-6-intro` as a derived guide for Qwen prompt and workflow design
- the provider-neutral registry snapshot in `core/contracts/core-registry.json`

That slice is intentional: consumer repositories should pin the version and fingerprint before adopting updates, then supply the declared local input contracts for any shared-with-local-inputs skill they enable.
