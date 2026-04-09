# Shared Core Validation Checklist

Class: operational.
Use rule: read as a gate list that references enforcement surfaces; do not infer a physical docs-class directory split from this checklist.

This is an operational gate, not the canonical authority source.

## Enforced Checks

These items are expected to be backed by scripts or validators.

- [ ] `codex-workflow-core/package.json` exists
- [ ] `codex-workflow-core/package.json` declares the current provider-neutral package version
- [ ] `codex-workflow-core/CHANGELOG.md` contains the release entry for the current package version
- [ ] `codex-workflow-core/.codex-plugin/plugin.json` exists and matches the package version
- [ ] `codex-workflow-core/core/README.md` exists and describes the portable core slice
- [ ] `codex-workflow-core/core/contracts/core-registry.json` exists and validates
- [ ] `codex-workflow-core/core/contracts/provider-capabilities.json` exists and validates
- [ ] `codex-workflow-core/core/contracts/output-contracts.json` exists and validates
- [ ] `codex-workflow-core/core/contracts/tool-contracts/catalog.json` exists and validates
- [ ] `codex-workflow-core/core/skills/` contains the portable priority skills
- [ ] `codex-workflow-core/providers/openai-codex/` contains the canonical OpenAI-Codex adapter
- [ ] `codex-workflow-core/providers/anthropic-claude/` contains the canonical Claude adapter
- [ ] `codex-workflow-core/providers/qwen-code/` contains the canonical Qwen Code adapter
- [ ] `codex-workflow-core/providers/kimi-k2_5/` contains the canonical Kimi K2.5 adapter
- [ ] `codex-workflow-core/docs/architecture.md` defines the documentation authority model
- [ ] `codex-workflow-core/docs/authority-matrix.md` records claim status and evidence notes
- [ ] `codex-workflow-core/docs/usage.md` exists as the operational entrypoint
- [ ] `codex-workflow-core/docs/` contains the canonical docs, operational docs, derived docs, and archive docs
- [ ] `codex-workflow-core/contracts/core-registry.json` and `codex-workflow-core/contracts/provider-capabilities.json` remain compatibility mirrors
- [ ] `codex-workflow-core/providers/` contains the provider adapter scaffolds
- [ ] `codex-workflow-core/providers/<provider>/export.json` files are regenerated from the neutral registry
- [ ] `codex-workflow-core/skills/` contains the mirrored shared skills
- [ ] `codex-workflow-core/core/skills/repo-audit/SKILL.md` is present and declares the portable core metadata
- [ ] `codex-workflow-core/skills/repo-intake-sot-mapper/SKILL.md` is classified as `shared-with-local-inputs`
- [ ] `codex-workflow-core/skills/runtime-policy-auditor/SKILL.md` is classified as `shared-with-local-inputs`
- [ ] `codex-workflow-core/docs/shared-with-local-inputs.md` documents the local-input pattern
- [ ] `codex-workflow-core/docs/repo-intake-skill-contract.md` documents the contract shape
- [ ] `codex-workflow-core/docs/runtime-policy-skill-contract.md` documents the runtime-policy contract shape
- [ ] `codex-workflow-core/templates/` contains the shared templates
- [ ] `codex-workflow-core/examples/` contains generic examples
- [ ] `codex-workflow-core/scripts/tools/` contains the shared validation scripts
- [ ] `codex-workflow-core/scripts/tools/validate-local-input-contract.mjs` validates consumer-local contracts
- [ ] `codex-workflow-core/scripts/tools/validate-runtime-policy-input-contract.mjs` validates runtime-policy contracts
- [ ] `codex-workflow-core/scripts/tools/build-neutral-core-registry.mjs` can regenerate the neutral registry snapshot
- [ ] `codex-workflow-core/scripts/tools/build-provider-exports.mjs` can regenerate the provider export bundles
- [ ] `codex-workflow-core/scripts/tools/run-certification-evals.mjs` can run the certification fixtures
- [ ] `codex-workflow-core/scripts/tools/validate-provider-neutral-core.mjs` validates the neutral registry and provider scaffolds
- [ ] `codex-workflow-core/scripts/tools/validate-repo-surface.mjs` combines package and neutral-core validation
- [ ] `codex-workflow-core/scripts/tools/calculate-package-fingerprint.mjs` produces a stable fingerprint
- [ ] Shared skill frontmatter includes the required metadata fields
- [ ] `repo-intake-sot-mapper` declares `input_contract_path` and a `## Local Inputs` section
- [ ] `runtime-policy-auditor` declares `input_contract_path`, `## Local Inputs`, and `## Non-Goals`
- [ ] The local repo package still validates after the scaffold is added
- [ ] The certification eval suite passes after the provider export bundles are regenerated

## Conditional Checks

Conditional checks are only evaluated when the surface is present or explicitly adopted. Absence is not failure unless the repo is expected to provide the surface.
- The class model in [docs/architecture.md](C:/workspace/main_projects/codex-workflow-core/docs/architecture.md) is logical only; it does not require physical `canonical/`, `operational/`, `derived/`, or `archive` directories.

- [ ] If `/.codex/shared-core-map.json` is present, it is valid JSON
- [ ] If `/.codex/shared-core-map.json` is present, it classifies shared, local, contract-only, and deferred assets explicitly

## Advisory Checks

Advisory items are guidance, not gate failures.

- [ ] Use [docs/maintainer-commands.md](C:/workspace/main_projects/codex-workflow-core/docs/maintainer-commands.md) for command syntax before running helper-only or validator-backed commands manually.
- [ ] Treat catalog `contract-only` and `stub` rows as non-runnable even when the names read like actions.
- [ ] Keep helper-only scripts labeled as helper-only in docs so they do not read like exported product tools.
