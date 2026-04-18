# Usage

Class: operational.
Use rule: operator flow only; canonical rules live in architecture and authority-matrix.

Operational entrypoint for consumer adoption and maintainer work.

## Start Here

1. Read [README.md](README.md) for the docs map.
2. Read [architecture.md](architecture.md) and [authority-matrix.md](authority-matrix.md).
3. Open the boundary doc that matches the task:
   - [../core/README.md](../core/README.md) for the portable core slice
   - [../contracts/README.md](../contracts/README.md) for the neutral registry or capability matrix
   - [../providers/README.md](../providers/README.md) for provider-specific packaging or export boundaries
   - [../evals/README.md](../evals/README.md) for certification fixtures or parity checks
   - [repo-overlay-contract.md](repo-overlay-contract.md) for shared versus local boundaries
4. Use [validation-checklist.md](validation-checklist.md) for gates, not for canonical rules.

## Choose The Operational Doc

- First-time adoption: [adoption-playbook.md](adoption-playbook.md)
- Existing consumer refresh or rollout: [consumer-rollout-playbook.md](consumer-rollout-playbook.md)
- Exact maintainer commands: [maintainer-commands.md](maintainer-commands.md)
- Portable skill authoring: [authoring-guides.md](authoring-guides.md)

## Boundary Rules

- `README.md` is the docs index before deeper guides.
- `overview.md` is summary only; `eval-baseline.md` is derived evidence.
- `../core/contracts/core-registry.json` is the machine-readable neutral registry snapshot.
- `../contracts/core-registry.json` remains the compatibility mirror.
- This class model is logical only; it does not imply physical subdirectories in the repo.
