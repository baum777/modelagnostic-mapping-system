# Consumer Rollout Playbook

This is the repeatable adoption path for a new consumer repository.

## 1. Initialize

- confirm the consumer repo is a safe candidate
- run `npm run init-consumer -- --consumer <repo-path>` from the standalone shared-core repo
- commit the generated overlay files in the consumer repo
- if the consumer adopts `repo-intake-sot-mapper`, add `.codex/repo-intake-inputs.json` before validation and keep it repo-local
- if the consumer adopts `runtime-policy-auditor`, add `.codex/runtime-policy-inputs.json` before validation and keep it repo-local

## 2. Refresh

- run `npm run refresh-lock -- --consumer <repo-path>` after any shared-core release or fingerprint change
- review the manifest diff before merging

## 3. Validate

- run `npm run validate-consumer -- --consumer <repo-path>`
- run `npm run validate-input-contract -- --contract <repo-path>/.codex/repo-intake-inputs.json` for consumers that adopt `repo-intake-sot-mapper`
- run `npm run validate-runtime-policy-input-contract -- --contract <repo-path>/.codex/runtime-policy-inputs.json` for consumers that adopt `runtime-policy-auditor`
- use the consumer repo's local wrapper if one exists

## 4. Roll Back

- if the standalone shared-core is unavailable, a consumer may temporarily point back to the UNITERA compatibility mirror only for emergency continuity
- treat that fallback as transitional only

## 5. Shared vs Local Boundaries

Shared-core owns generic workflow assets.
The consumer owns repo policy, canonical sources, local evidence, and environment assumptions.
Shared-with-local-inputs skills add a consumer-local contract under `.codex/` so the shared skill can stay generic without guessing at repo truth.

## 6. Compatible Updates

A compatible update changes the shared-core package without breaking the consumer overlay contract.
A breaking update requires a lock refresh, a manifest review, and usually a consumer overlay adjustment.
