# Authoring Guides

Class: operational.
Use rule: use these instructions when creating or updating portable skills, tool contracts, or provider exports.

## Skill Authoring

1. Put portable skills in `core/skills/`.
2. Declare portable identity and output contract paths in frontmatter.
3. Add explicit `## Tool Requirements`, `## Approval Mode`, `## Provider Projections`, and `## Eval Scaffolding` sections.
4. Keep provider-specific behavior out of the skill body.
5. Use exact headings in the `## Output` section so the registry builder can validate them.

## Tool Contract Authoring

1. Put normalized tool contracts in `core/contracts/tool-contracts/catalog.json`.
2. Include `tool_name`, `intent_class`, `schema`, `side_effects`, `approval_required`, `mcp_compatible`, `providers`, and `routing_hints`.
3. Keep compatibility mirrors in the legacy `docs/tool-contracts/catalog.json` only when needed.

## Export Authoring

1. Regenerate the neutral registry with `npm run build-registry`.
2. Regenerate canonical provider exports with `npm run build-exports`.
3. Run `npm run eval` before trusting a migration slice.

## Eval Authoring

1. Add fixture files under `evals/fixtures/`.
2. Register them in `evals/catalog.json`.
3. Prefer fail-closed checks that compare declared metadata rather than narrative summaries.

