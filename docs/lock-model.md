# Lock Model

The consumer lock is intentionally boring.

## Fields

- `sharedCoreSource`: consumer-resolved path reference to the standalone shared-core repository
- `sharedCoreVersion`: package version from the shared-core `package.json`
- `packageFingerprint`: SHA-256 fingerprint of the shared-core package state
- `sharedCoreMode`: explicit linkage mode for the consumer
- `adoptedSkills`: the subset of shared skills used by the consumer
- `deferredSkills`: shared skills that remain out of scope for the consumer
- `localOverlayFiles`: consumer-owned docs and wrappers that must stay local

## Fingerprint Inputs

The fingerprint is produced by `scripts/tools/calculate-package-fingerprint.mjs`.
It includes every file under the shared-core repository root except:

- `.git/`
- `node_modules/`
- `dist/`
- `coverage/`

That means the fingerprint changes when any shared-core file changes.

## Compatibility Rule

If the version or fingerprint changes, refresh the consumer lock before treating the consumer as current.
