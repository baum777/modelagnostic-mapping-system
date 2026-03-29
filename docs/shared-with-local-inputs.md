# Shared With Local Inputs

Some shared-core skills are reusable only when the consumer repository supplies explicit local inputs.

## Pattern

- the shared skill lives in the standalone shared-core repository
- the consumer repo supplies a machine-readable local contract under `.codex/`
- the shared skill reads only the declared local inputs
- the skill must not infer hidden truth outside the declared contract

## Current Example

- skill: `repo-intake-sot-mapper`
- local contract: `.codex/repo-intake-inputs.json`

## Second Example

- skill: `runtime-policy-auditor`
- local contract: `.codex/runtime-policy-inputs.json`

## Guardrail

If the consumer repo does not supply the declared local contract, the skill is not ready for use.

## Validation

Use `npm run validate-input-contract -- --contract <consumer>/.codex/repo-intake-inputs.json` before trusting the skill in a new repository.
Use `npm run validate-runtime-policy-input-contract -- --contract <consumer>/.codex/runtime-policy-inputs.json` before trusting runtime policy auditing in a new repository.
