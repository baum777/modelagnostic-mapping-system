# Architecture

The shared core is split into two layers:

## Shared Core

- reusable workflow skills
- reusable templates and examples
- reusable helper scripts
- shared tool contracts
- shared validation logic
- shared-with-local-inputs skills with explicit consumer-owned contracts

## Local Overlay

- repository-specific governance
- canonical source maps
- evidence logs
- deployment assumptions
- local-only wrappers or skills
- consumer-local input contracts for shared-with-local-inputs skills

## Boundary Rule

Shared assets stay generic.
Local overlays stay explicit and repository-owned.
