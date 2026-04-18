# Consumer Rollout Playbook

Use this playbook after a consumer overlay already exists.

## Scope

- refresh the consumer lock after shared-core updates
- validate consumer linkage
- validate any adopted local input contracts

## Flow

1. Refresh the lock when the shared-core version or fingerprint changes.
2. Validate consumer linkage.
3. Validate local input contracts for adopted shared-with-local-inputs skills.
4. Review the manifest diff before merge or rollout.

## Notes

- Rollback behavior is consumer-specific; do not infer live-readiness from this document.
- Exact commands live in [maintainer-commands.md](maintainer-commands.md).
- Canonical boundary rules live in [architecture.md](architecture.md) and [repo-overlay-contract.md](repo-overlay-contract.md).
