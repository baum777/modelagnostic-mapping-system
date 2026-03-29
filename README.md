# codex-workflow-core

Standalone authoritative shared-core repository for the Codex workflow package.

## Purpose

- provide reusable Codex workflow skills, templates, examples, docs, and helper scripts
- keep planning, implementation, review, and validation flows explicit and deterministic
- serve as the versioned source of truth for consumer repositories

## Versioning

- package version: `0.1.4`
- compatibility: semver, fail closed on breaking metadata changes
- consumer linkage: file-path reference plus explicit version and fingerprint pin

## Maintainer Commands

- `npm run refresh-lock -- --consumer <repo-path>`
- `npm run validate-consumer -- --consumer <repo-path>`
- `npm run init-consumer -- --consumer <repo-path>`
- `npm run validate-input-contract -- --contract <path>`
- `npm run validate-runtime-policy-input-contract -- --contract <path>`

## Parameterized Skills

- `repo-intake-sot-mapper` uses a consumer-local input contract declared in `.codex/repo-intake-inputs.json`.
- `runtime-policy-auditor` uses a consumer-local input contract declared in `.codex/runtime-policy-inputs.json`.
- See `docs/shared-with-local-inputs.md` and `docs/repo-intake-skill-contract.md`.
- Validate the contract with `npm run validate-input-contract -- --contract <consumer>/.codex/repo-intake-inputs.json`.
- Validate the runtime policy contract with `npm run validate-runtime-policy-input-contract -- --contract <consumer>/.codex/runtime-policy-inputs.json`.

## Validate

- `npm run validate`
- `npm run fingerprint`

## Layout

- `docs/` portable docs and contracts
- `skills/` reusable skills
- `scripts/tools/` deterministic helpers and validators
- `templates/` shared templates
- `examples/` shared examples
