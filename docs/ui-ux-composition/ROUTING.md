# Routing

Class: derived.
Use rule: internal branch routing guidance only.

## Routing Inputs

- `mode`
- `artifact_type`
- `product_type`
- `known_problems`
- `content_blocks`
- `requested_outputs`

## Routing Rules

- `generate` -> `layout-composer`, `proportion-engine`, `responsive-composition-engine`
- `audit` -> `ui-design-critic`, `hierarchy-auditor`, `spacing-rhythm-engine`, `typography-governor`, `ux-clarity-checker`
- `refine` -> problem-specific modules, then `ui-design-critic`
- `normalize` -> `consistency-auditor`, `spacing-rhythm-engine`, `typography-governor`, `design-token-orchestrator`
- `tokenize` -> `design-token-orchestrator`, optionally `type-scale-engine`, `spacing-rhythm-engine`

## Router Rule

- The module list is a taxonomy and not an executable subskill tree in v1.
