# Repo Overlay Contract

The overlay contract defines what stays local in a consumer repository.

## Local Responsibilities

- root `AGENTS.md`
- canonical source map for that repository
- evidence logs and run history
- environment and deployment assumptions
- repo-specific wrappers or adapters
- any local-only skills

## Shared Responsibilities

- generic skill logic
- generic templates and examples
- shared validation logic
- shared tool contracts

## Required Overlay Shape

```json
{
  "coreVersion": "0.1.0",
  "schemaVersion": "1.0.0",
  "canonicalSources": ["docs/repo-specific-canonical-sources.md"],
  "localSkillsDir": "skills-local",
  "localToolAdaptersDir": "scripts/local",
  "enabledSkills": ["planning-slice-builder"],
  "disabledSkills": [],
  "validation": {
    "failClosed": true,
    "requireApprovalForWrites": true
  }
}
```

## Contract Rule

The overlay must not silently rewrite shared-core files.
All local exceptions must remain visible in the overlay config or in local docs.
