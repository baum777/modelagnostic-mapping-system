# model-agnostic-workflow-system

Class: canonical.
Use rule: shortest practical front door; point to the docs hierarchy instead of duplicating it.

Provider-neutral shared-core repository for governed agent workflow artifacts. Codex is a compatibility export, not the only surface.

## Observed Surfaces

- `core/` portable core slice
- `skills/` legacy shared-exported skills
- `contracts/` compatibility mirrors and registries
- `providers/` canonical adapter exports and legacy mirrors
- `docs/` authority, navigation, operational, derived, and archive docs
- `.agents/skills/` repo-local control-plane skills
- `scripts/tools/` validators and deterministic helper scripts
- `templates/` shared workflow templates
- `examples/` shared workflow examples

## Start Here

- [docs/README.md](docs/README.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/authority-matrix.md](docs/authority-matrix.md)
- [docs/usage.md](docs/usage.md)
- [core/README.md](core/README.md)
- [contracts/README.md](contracts/README.md)
- [providers/README.md](providers/README.md)
- [evals/README.md](evals/README.md)
- [AGENTS.md](AGENTS.md)

## Reuse Surfaces

- `core/` is the portable core slice.
- `contracts/` and `providers/` separate canonical exports from compatibility mirrors.
- `docs/ui-ux-composition-branch.md` is the canonical branch charter when working on that branch.
- `docs/model-agnostic-core-prompt-system.md` is the canonical prompt-system reference when working on layered prompt architecture.
- `docs/shared-with-local-inputs.md`, `docs/repo-intake-skill-contract.md`, and `docs/runtime-policy-skill-contract.md` define the contract-bound skill surfaces.

## Operational Commands

- `npm run validate` to validate the repo surface
- `npm run validate-neutral` when neutral registry or provider scaffolds change
- `npm run build-registry` when `core/contracts/core-registry.json` needs regeneration
- `npm run build-exports` when provider export bundles need regeneration
- `npm run eval` when certification fixtures or provider exports change
- `npm run fingerprint` when the package state must be pinned
- `npm run validate-consumer` when linkage, overlay, or adoption surfaces change
- `npm run scan` to inspect repository structure
- `npm run diff` to explain git diffs
