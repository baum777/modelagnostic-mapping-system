# Adoption Playbook

Use this playbook when adopting the shared core in a new repository.

## Steps

1. Create the repo-local overlay files.
2. Pin a specific shared-core version.
3. Materialize the shared core into local paths.
4. Fill in repo-specific canonical sources and runtime assumptions.
5. Run the shared-core validator and the repo-local validator.
6. Only then enable the package in Codex.

## Required Overlay Files

- `AGENTS.md`
- `docs/repo-specific-canonical-sources.md`
- `.codex/workflow.overlay.json`
- `.codex/workflow.lock.json`
- any repo-specific skill or script overrides

## Adoption Rules

- Keep consumer-owned policy local.
- Do not edit the shared core directly from the consumer repo.
- Treat a failing overlay validation as a hard stop.
- Prefer a pinned snapshot over a floating dependency.

## Rollout Order

1. read-only skills
2. validation helpers
3. review summaries
4. write-gated operations
5. deploy-readiness checks
