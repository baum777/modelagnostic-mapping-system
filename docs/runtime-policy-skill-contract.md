# Runtime Policy Skill Contract

The `runtime-policy-auditor` skill uses a consumer-local contract file so runtime policy can stay explicit without becoming a hidden repo assumption.

## Required File

- `.codex/runtime-policy-inputs.json`

## Required Fields

- `skill`
- `repoRoot`
- `runtimePolicyDocs`
- `runtimeConfigFiles`
- `controlSurfaceFiles`
- `killSwitchFiles`
- `approvalBoundaryFiles`
- `postureOrModeDefinitions`
- `healthOrStatusSurfaceFiles`
- `optionalEnvReferenceFiles`
- `ignorePaths`
- `notes`

## Contract Rules

- `skill` must be `runtime-policy-auditor`
- `repoRoot` must be `.`
- all array fields must contain strings
- `runtimePolicyDocs`, `runtimeConfigFiles`, `controlSurfaceFiles`, `killSwitchFiles`, `approvalBoundaryFiles`, `postureOrModeDefinitions`, `healthOrStatusSurfaceFiles`, and `ignorePaths` must be non-empty
- `optionalEnvReferenceFiles` may be empty, but if present it must still be an array of strings
- `ignorePaths` must include `.git`, `node_modules`, `dist`, and `coverage`

## Purpose

The contract tells the shared skill where to look for declared runtime policy, control surfaces, kill switches, approval boundaries, posture semantics, and health/status surfaces without embedding repository-specific assumptions into the skill itself.

## Explicit Boundary

This contract is not a live-readiness or capital-safety contract.
It only describes runtime policy evidence that the consumer repository has explicitly declared.

## Validation

Validate the consumer contract with:

```bash
npm run validate-runtime-policy-input-contract -- --contract <consumer>/.codex/runtime-policy-inputs.json
```
