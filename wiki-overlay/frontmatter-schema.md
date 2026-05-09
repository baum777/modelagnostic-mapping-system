---
zone: operational-playbook
authority: operational
source_path: wiki-overlay/frontmatter-schema.md
llm_processing: yes
summary_allowed: yes
wiki_allowed: pointer-only
copy_policy: metadata-only
privacy: internal
maturity: prose-governed
status: active
canonical_source: audit/local-llm-wiki-review-decisions.md
review_gate: none
notes: "Overlay-only frontmatter schema proposal; no automatic insertion into original repo files."
generated_at: "2026-05-09T06:09:10+02:00"
overlay_spec_version: "1.0"
---

# Frontmatter Schema

> non-migrating overlay - no original file edits - pointer-only index

## Zweck

Diese Datei dokumentiert ein overlay-only Frontmatter-Schema fuer lokale LLM-/Obsidian-Maps. Das Schema ist rein dokumentarisch: Es erzeugt keinen Code, fuegt kein Frontmatter in Originaldateien ein und veraendert keine bestehenden Repo-Dateien.

## Scope

- **Zonen**: alle freigegebenen Mapping-Zonen aus den Audit-Entscheidungen.
- **Authority-Klassen**: canonical, operational, derived, generated, compatibility und review-/private-nahe Klassen.
- **Gilt fuer**: neue oder bestehende Dateien unter `wiki-overlay/` und audit-nahe Overlay-Artefakte.
- **Gilt nicht fuer**: Originaldateien wie `AGENTS.md`, `WORKFLOW.md`, `docs/*`, `core/contracts/*`, `providers/*`, `memory/*` oder project imports.
- **Default-Regel**: Unklare oder gemischte Quellen werden fail-closed als `needs-human-review`, `authority: unknown`, `llm_processing: review-only`, `copy_policy: no-copy` klassifiziert.

## Map / Entries

| Source Path | Zone | Authority | Copy Policy | LLM Processing | Review Gate | Notes |
|-------------|------|-----------|-------------|----------------|-------------|-------|
| `audit/local-llm-wiki-review-decisions.md` | `operational-playbook` | `operational` | `metadata-only` | `yes` | `none` | Primary decision source for zone approvals, limits and exclusions. |
| `audit/local-llm-wiki-path-mapping.md` | `operational-playbook` | `operational` | `metadata-only` | `yes` | `none` | Source for zone definitions, examples and fail-closed defaults. |
| `wiki-overlay/authority-map.md` | `canonical-source` | `canonical` | `pointer-only` | `yes` | `none` | Reference overlay for existing header shape and canonical enum usage. |

## Required Fields

Diese neun Felder sind das minimale Pflichtschema fuer Overlay-Dateien. Defaults sind fail-closed und duerfen nur durch eine dokumentierte Zone-Decision enger oder offener gesetzt werden.

| Field | Required | Default | Allowed Values | Purpose |
|---|---|---|---|---|
| `zone` | yes | `needs-human-review` | `canonical-source`, `operational-playbook`, `derived-knowledge`, `compatibility-mirror`, `generated-output`, `template-source`, `runtime-evidence`, `private-or-local`, `project-import`, `archive-reference`, `exclude-from-llm-context`, `needs-human-review` | Logische Wissenszone statt physischer Repo-Ordner. |
| `authority` | yes | `unknown` | `canonical`, `operational`, `derived`, `archive`, `compatibility`, `generated`, `local-only`, `private`, `mixed`, `unknown`, `portable`, `template`, `example`, `advisory`, `mirror`, `validator-backed`, `implementation`, `enforced`, `canonical-linked`, `project-import` | Autoritaetsklasse der referenzierten Quelle oder Overlay-Datei. |
| `source_path` | yes | `<current-overlay-file>` | relative repo path | Pfad des Overlay-Artefakts oder der beschriebenen Quelle. |
| `llm_processing` | yes | `review-only` | `yes`, `no`, `review-only` | Ob ein LLM die Quelle lesen oder verarbeiten darf. |
| `summary_allowed` | yes | `review-only` | `yes`, `no`, `review-only` | Ob Zusammenfassungen erlaubt sind. |
| `wiki_allowed` | yes | `review-only` | `yes`, `no`, `pointer-only`, `review-only` | Ob die Quelle in einem Wiki sichtbar werden darf. |
| `copy_policy` | yes | `no-copy` | `pointer-only`, `metadata-only`, `no-copy`, `redacted-summary-only` | Wie viel Inhalt uebernommen werden darf. |
| `privacy` | yes | `review` | `public`, `internal`, `private`, `local`, `review`, `mixed` | Privatheits- und Freigabestatus. |
| `status` | yes | `review-only` | `active`, `proposed`, `review-only`, `excluded`, `archived`, `draft` | Lebenszyklusstatus des Overlay-Eintrags. |

## Recommended Fields

Diese Felder sind nicht Teil des 9-Feld-Minimums, bleiben aber fuer konsistente Overlay-Dateien empfohlen.

| Field | Default | Allowed Values | Purpose |
|---|---|---|---|
| `maturity` | `not-claimed` | `prose-governed`, `contract-backed`, `validator-backed`, `runtime-implemented`, `not-claimed` | Reifegrad: Prosa, Contract, Validator oder Runtime. |
| `canonical_source` | `null` | relative repo path or `null` | Ruecklink auf canonical source, falls vorhanden. |
| `review_gate` | `human-review-required` | `none`, `human-review-required`, `exclusion-lock`, `owner-approval-required` | Naechste Review-Barriere. |
| `notes` | `""` | short string | Kurze Rationale ohne Volltextkopie. |
| `generated_at` | `<ISO8601>` | ISO8601 timestamp | Auditierbarer Erstellzeitpunkt der Overlay-Datei. |
| `overlay_spec_version` | `"1.0"` | string | Schema-/Overlay-Version. |

## Zone Defaults

| Zone | Default Authority | LLM Processing | Summary Allowed | Wiki Allowed | Copy Policy | Default Status |
|---|---|---|---|---|---|---|
| `canonical-source` | `canonical` | `yes` | `review-only` | `pointer-only` | `pointer-only` | `active` |
| `operational-playbook` | `operational` | `yes` | `yes` | `yes` | `pointer-only` | `active` |
| `derived-knowledge` | `derived` | `yes` | `yes` | `yes` | `pointer-only` | `active` |
| `compatibility-mirror` | `compatibility` | `review-only` | `review-only` | `pointer-only` | `metadata-only` | `review-only` |
| `generated-output` | `generated` | `review-only` | `review-only` | `pointer-only` | `metadata-only` | `review-only` |
| `template-source` | `template` | `yes` | `review-only` | `yes` | `pointer-only` | `active` |
| `runtime-evidence` | `validator-backed` | `review-only` | `review-only` | `review-only` | `redacted-summary-only` | `review-only` |
| `private-or-local` | `private` | `no` | `no` | `no` | `no-copy` | `excluded` |
| `project-import` | `project-import` | `review-only` | `review-only` | `review-only` | `metadata-only` | `review-only` |
| `archive-reference` | `archive` | `yes` | `yes` | `pointer-only` | `pointer-only` | `archived` |
| `exclude-from-llm-context` | `private` | `no` | `no` | `no` | `no-copy` | `excluded` |
| `needs-human-review` | `unknown` | `review-only` | `review-only` | `review-only` | `no-copy` | `review-only` |

## Overlay-Only Rule

- Frontmatter darf nur in Overlay-Dateien oder neu erstellten Audit-/Mapping-Artefakten vorgeschlagen oder geschrieben werden.
- Originaldateien bleiben unveraendert; insbesondere keine automatische Einfuegung in `AGENTS.md`, `README.md`, `WORKFLOW.md`, `docs/*`, `core/contracts/*`, `providers/*`, `memory/*` oder project imports.
- Wenn eine Originaldatei beschrieben werden soll, geschieht das ueber Pointer-Felder wie `source_path`, `canonical_source` oder Tabellenzeilen in einer Overlay-Datei.
- Machine-readable JSON, generated exports, runtime evidence und private/local Bereiche duerfen nicht durch Frontmatter-Prosa ersetzt werden.
- Bei widerspruechlicher Klassifikation gewinnt die vorsichtigere Zone: `exclude-from-llm-context` vor `private-or-local`, dann `needs-human-review`, dann review-only Zonen.

## Example Header

```yaml
---
zone: needs-human-review
authority: unknown
source_path: wiki-overlay/example-map.md
llm_processing: review-only
summary_allowed: review-only
wiki_allowed: review-only
copy_policy: no-copy
privacy: review
status: review-only
maturity: not-claimed
canonical_source: null
review_gate: human-review-required
notes: "Fail-closed default until source class and privacy are reviewed."
generated_at: "2026-05-09T00:00:00+02:00"
overlay_spec_version: "1.0"
---
```

## Pointer-Only References

- `Review Decisions` -> `audit/local-llm-wiki-review-decisions.md` - overlay-only frontmatter decision and zone restrictions.
- `Path Mapping` -> `audit/local-llm-wiki-path-mapping.md` - zone definitions, defaults and Obsidian suitability hints.
- `Authority Map` -> `wiki-overlay/authority-map.md` - existing overlay header reference and canonical-source example.

## Open / Review-Required

- [ ] Decide whether `maturity`, `canonical_source`, `review_gate`, `generated_at` and `overlay_spec_version` should become required in a future schema version.
- [ ] Decide whether `privacy: mixed` should remain allowed or be represented only through `privacy: review`.
- [ ] Decide whether `wiki_allowed: yes` should be narrowed to `pointer-only` for all canonical machine-readable contract surfaces.
- [ ] Decide whether every `compatibility-mirror` entry must include a `canonical_source` pointer.
- [ ] Decide whether a validator should check overlay frontmatter later; current file is documentation only.

## Changelog

- `2026-05-09`: initial proposed - Codex Overlay-Generator, schema-only and overlay-only, with no original file edits.
