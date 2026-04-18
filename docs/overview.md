# Shared Core Overview

Class: derived.
Use rule: summary only; do not use it to decide authority or enforcement status.

This page is a summary only. For canonical authority, read [architecture.md](architecture.md) and [authority-matrix.md](authority-matrix.md); for operator flow, read [usage.md](usage.md).

## Scope

This shared core is limited to reusable workflow assets:

- portable core skills under `../core/skills/`
- normalized output contracts under `../core/contracts/output-contracts.json`
- normalized tool contracts under `../core/contracts/tool-contracts/catalog.json`
- canonical provider capabilities under `../core/contracts/provider-capabilities.json`
- the neutral registry snapshot under `../core/contracts/core-registry.json`
- compatibility mirrors under `../contracts/`
- provider adapter scaffolds under `../providers/`
- planning and review skills
- generic templates and examples
- generic helper scripts
- shared validation expectations
- parameterized skills that rely on explicit consumer-local input contracts

## Boundary

The shared core does not own repo-specific governance, evidence logs, or runtime assumptions.
Consumer repositories must supply those through a local overlay.
- This is a logical class label only; there is no physical derived-docs directory in the current repo layout.
