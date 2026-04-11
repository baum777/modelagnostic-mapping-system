---
name: neon-db-setup
description: Set up and validate Neon Postgres connections with fail-closed runtime, migration, and environment wiring guidance for generic projects.
version: 1.0.0
classification: shared
requires_repo_inputs: false
produces_structured_output: true
safe_to_auto_run: false
owner: codex-workflow-core
status: extracted
output_contract_path: core/contracts/output-contracts.json
tool_contract_catalog_path: core/contracts/tool-contracts/catalog.json
provider_projection_path: core/contracts/portable-skill-manifest.json
eval_profile_path: evals/catalog.json
---

# Neon Database Setup

## Trigger

Use this skill when a project needs a Neon Postgres database created, wired, migrated, or validated and the setup must stay generic across stacks, tools, and model environments.

## When Not To Use

- Do not use for non-Neon databases.
- Do not use when changing database providers is out of scope.
- Do not use to redesign the app, schema, or deployment topology.
- Do not use to claim database readiness without connectivity and migration evidence.
- Do not use when a write or secret change would be made from incomplete state.

## Non-Goals

- This skill does not choose Neon for you.
- This skill does not design application schema or ORM strategy.
- This skill does not replace the project’s secret-management, access-control, or CI policy.
- This skill does not assume one framework, one migration tool, one shell, or one operating system.
- This skill does not treat a pooled URL as the migration target.

## Workflow

1. Inspect the project’s current truth: env samples, DB commands, migration entrypoints, and any notes that identify the target database.
2. Identify the Neon project and retrieve both the pooled and direct URLs.
3. Map pooled to runtime and direct to migrations or admin tasks.
4. Write the values into the project’s actual env or secret surface and restart any process that caches env at boot.
5. Run migrations against the direct URL.
6. Start the application against the pooled URL.
7. Verify connectivity, migration success, and read/write behavior.
8. Stop immediately if the runtime and migration targets diverge or if any URL is malformed.

## Neon Concepts

- Neon is a managed Postgres platform with branchable databases and separate compute/storage concerns.
- Pooled connection strings route through a pooler. Use them for application runtime traffic, short-lived requests, serverless handlers, workers, and shared service traffic that benefits from connection reuse.
- Direct connection strings connect to the database endpoint without the pooler. Use them for migrations, admin tasks, schema inspection, maintenance, and any command that depends on session state or connection-level behavior.
- If a migration or admin command fails through pooling, switch that path to the direct URL instead of forcing the pooler.
- If runtime traffic opens many short-lived connections, prefer the pooled URL unless the project has a documented reason not to.

## Neon Docs Navigation

- Treat Neon documentation as the source of current product behavior. When the task needs exact setup, API, SDK, or command details, fetch the matching Neon doc instead of relying on stale local memory.
- The official Neon Agent Skills page says the main development skill is `neon-postgres`; `claimable-postgres` is the separate skill for disposable databases.
- The same Neon page documents install paths such as:
  - `npx skills add neondatabase/agent-skills -s neon-postgres`
  - `npx neonctl@latest init`
- The Neon skill coverage called out by Neon includes getting started, connection strings and pooling, Neon Auth, `@neondatabase/neon-js`, the Neon REST API and SDKs, and developer tools such as the CLI, VS Code extension, and MCP server.
- Use project-level install when the skill should travel with the project. Use global install only when the same Neon guidance should apply across all projects in a personal environment.
- If a project needs a disposable or ephemeral database workflow, treat that as a separate path rather than folding it into the main database setup skill.

## Required Inputs

- the Neon account or project where the database should live
- the target environment or branch name
- the project’s runtime database target
- the project’s migration or admin database target
- the application’s existing DB commands or equivalent CLI entrypoints
- the local env file names or secret-store locations the project already uses
- any existing services that must point to the same database target
- any migration history or schema baseline already in the project

## Required Environment Variables

- `DATABASE_URL` for runtime traffic, usually pooled
- `DIRECT_URL` for migrations and admin tasks, usually direct
- optional names some projects already use: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DB_URL`, `MIGRATION_DATABASE_URL`
- optional read/write split names if the project already uses them: `READ_ONLY_DATABASE_URL`, `READ_WRITE_DATABASE_URL`
- local env examples such as `.env`, `.env.local`, `.env.development`, `.env.test`, or a project-specific equivalent

## Tool Requirements

- No Neon-specific tool is required.
- Use the project’s existing shell, database client, migration command, and secret/config mechanism.
- Optional supporting workflows: current-truth review, readiness checks, failure analysis, and migration planning.

## Approval Mode

- approval-required
- require explicit approval before any action that creates or mutates a Neon project, database branch, secret, or CI/runtime environment.
- read-only inspection and validation may proceed without approval when no remote-state change is performed.

## Provider Projections

- OpenAI/Codex: native
- Claude: adapter
- Qwen Code: adapter
- Kimi K2.5: adapter

## Eval Scaffolding

- routing
- schema conformance
- tool selection
- approval boundary
- provider parity
- failure modes

## Setup Procedure

1. Create or select the Neon project and database branch for the target environment.
2. Copy both the pooled and direct Postgres URLs from Neon.
3. Map the pooled URL to the runtime variable and the direct URL to the migration or admin variable.
4. Update the local env file, secret store, or CI environment that the project actually reads.
5. Keep one source of truth for each service. If multiple services share the same database, point them to the same Neon branch or stop.
6. Restart the process, worker, or dev server after env changes. Do not assume a running process picked up new values automatically.
7. Run migrations against the direct URL.
8. Start the application against the pooled URL.
9. Verify the application can read and write the expected state.
10. If the project has separate runtime, migration, and test targets, verify each target independently before declaring the setup complete.

### Example Commands

- Generic command pattern:
```bash
# install dependencies
# load environment
# run db status
# run migrations
# start application
```
- Example project-native commands:
```bash
npm run db:status
npm run db:migrate
npm run start
```
```bash
python manage.py migrate
python app.py
```
- Example direct connection check:
```bash
psql "$DIRECT_URL" -c 'select 1;'
```

## Validation Checklist

- The Neon project and target database exist.
- The pooled and direct URLs are both identified and not confused.
- Runtime code reads the pooled URL.
- Migration code reads the direct URL.
- Env values are present in the right local file or secret store.
- The process has been restarted after env changes.
- `select 1` or an equivalent connectivity check succeeds with the intended URL.
- Migrations complete successfully against the direct URL.
- The app can read and write the expected schema or seed data.
- Multiple services do not point to inconsistent database hosts, names, or branches.
- Any health or status command exits cleanly.

## Troubleshooting

- `too many clients` or pool exhaustion:
  - move runtime traffic to the pooled URL
  - reduce per-request connection churn
  - close connections aggressively in short-lived jobs
  - keep migration and admin traffic off the pooler
- SSL or TLS failures:
  - confirm the client expects TLS and that the URL uses the Neon-supported settings
  - add the client-specific SSL requirement only if the driver needs it
  - do not disable TLS to make a connection succeed
- invalid connection string:
  - verify the scheme, host, port, username, password, and database name
  - check percent-encoding and secret interpolation
  - confirm the URL was copied in full
- auth failures:
  - verify the password and role used by the running process
  - confirm the process actually loaded the current env values
  - refresh any rotated secret in every place that reads it
- migration failures:
  - switch migration traffic to the direct URL
  - rerun migrations serially if the tool supports concurrency controls
  - inspect locks, partial migrations, and permission errors
- service boots but cannot talk to the database:
  - restart the service after env changes
  - confirm the runtime path uses the pooled URL
  - check for stale `.env` values or CI secret overrides
  - verify all dependent services reference the same database target
- multiple services see different data:
  - compare host, database name, and branch identifiers
  - fail closed until the inconsistency is resolved

## Boundaries / Non-Goals

- This skill does not pick Neon over another provider for you.
- This skill does not redesign the app, schema, or service topology.
- This skill does not replace the project’s ORM, migration, or secret-management policy.
- This skill does not assume one shell, one framework, or one OS.
- This skill does not declare the setup done until connectivity and migrations are verified.

## Output

- `SUMMARY`
- `NEON CONCEPTS`
- `REQUIRED INPUTS`
- `REQUIRED ENVIRONMENT VARIABLES`
- `SETUP PROCEDURE`
- `VALIDATION CHECKLIST`
- `TROUBLESHOOTING`
- `BOUNDARIES / NON-GOALS`
- `OPEN GAPS`

## Quality Checks

- Separate pooled and direct connection strings explicitly.
- Fail closed on missing env values, malformed URLs, or inconsistent targets.
- Do not claim readiness without connectivity and migration evidence.
- Keep examples generic and label them as examples when they are not project-native.
- Preserve project-specific command names and env keys instead of inventing replacements.
