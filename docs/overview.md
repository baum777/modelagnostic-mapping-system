# Shared Core Overview

`codex-workflow-core` is the authoritative versioned shared-core repository for the Codex workflow package.

## Scope

This shared core is limited to reusable workflow assets:

- planning and review skills
- generic templates
- generic examples
- generic helper scripts
- shared validation expectations
- parameterized skills that rely on explicit consumer-local input contracts

## Boundary

The shared core does not own repo-specific governance, evidence logs, or runtime assumptions.
Consumer repositories must supply those through a local overlay.

## Intended Use

- consume the shared core as a versioned local source
- keep the overlay explicit and local
- validate the shared core before each adoption or update

## First Extraction Slice

This repository currently contains the reusable core slice plus two parameterized examples:

- `repo-intake-sot-mapper`
- `runtime-policy-auditor`

That is intentional: consumer repositories should pin the version and fingerprint before adopting updates, then supply the declared local input contracts for any shared-with-local-inputs skill they enable.
