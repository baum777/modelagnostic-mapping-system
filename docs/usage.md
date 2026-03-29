# Usage

Use the shared core as a local, materialized package boundary inside a consumer repository.

## Typical Flow

1. Read the repo overlay contract.
2. Initialize or refresh the consumer overlay.
3. If the consumer uses `repo-intake-sot-mapper`, validate `.codex/repo-intake-inputs.json` before mapping the repo.
4. If the consumer uses `runtime-policy-auditor`, validate `.codex/runtime-policy-inputs.json` before auditing runtime policy.
5. Use the planning and review skills for bounded work.
6. Keep write operations approval-gated.
7. Validate before merge or rollout.

## Preferred Entry Points

- `docs/overview.md`
- `docs/adoption-playbook.md`
- `docs/repo-overlay-contract.md`
- `docs/consumer-rollout-playbook.md`
- `docs/lock-model.md`
- `docs/maintainer-commands.md`
- `docs/shared-with-local-inputs.md`
- `scripts/tools/validate-shared-core-package.mjs`
- `scripts/tools/calculate-package-fingerprint.mjs`
- `scripts/tools/validate-runtime-policy-input-contract.mjs`
