---
zone: exclude-from-llm-context
authority: operational
source_path: wiki-overlay/private-exclusion-map.md
llm_processing: yes
summary_allowed: yes
wiki_allowed: pointer-only
copy_policy: metadata-only
privacy: internal
maturity: prose-governed
status: active
canonical_source: audit/local-llm-wiki-review-decisions.md
review_gate: none
notes: "Pattern-only exclusion map derived from audit decisions; excluded path contents were not read or copied."
generated_at: "2026-05-09T05:50:15+02:00"
overlay_spec_version: "1.0"
---

# Private Exclusion Map

> non-migrating overlay · no original file edits · pointer-only index

## Zweck

Diese Overlay-Datei dokumentiert Ausschlussmuster, Review-Gates und Grenzfälle fuer LLM-/Obsidian-Kontextaufnahme. Sie verwendet nur Pattern-Metadaten und Rationale aus den Audit-Artefakten, keine Inhalte aus ausgeschlossenen Pfaden.

## Scope

- **Zonen**: `exclude-from-llm-context`, `private-or-local`, `runtime-evidence`, `needs-human-review`, `operational-playbook`
- **Authority-Klassen**: `operational`, `private`, `local`, `generated`, `unknown`
- **Ausgeschlossen**: `.git/`, `.codex/`, echte `.env*`, `memory/` default locked, `artifacts/runtime-runs/`, operator memory, private logs, nicht freigegebene project imports, raw secrets, credentials, tokens, private keys
- **Quellen fuer diese Map**: `audit/local-llm-wiki-review-decisions.md`, `audit/local-llm-wiki-path-mapping.md`
- **Nicht gelesen**: Inhalte aus `.git/`, `.codex/`, `.env*`, `memory/`, `artifacts/runtime-runs/`, private logs oder project imports.

## Map / Entries

| Source Path | Zone | Authority | Copy Policy | LLM Processing | Review Gate | Notes |
|-------------|------|-----------|-------------|----------------|-------------|-------|
| `.git/` | `exclude-from-llm-context` | `local` | `no-copy` | `no` | `exclusion-lock` | VCS-Interna und Historie koennen entfernte, private oder obsolete Inhalte enthalten. |
| `.codex/` | `exclude-from-llm-context` | `private` | `no-copy` | `no` | `exclusion-lock` | Lokaler App-/Tool-State kann Session-, Konfigurations- oder Kontextdaten enthalten. |
| `.env*` | `exclude-from-llm-context` | `private` | `no-copy` | `no` | `exclusion-lock` | Echte Environment-Dateien sind secret-nahe Runtime-Konfiguration. |
| `.env.example` | `exclude-from-llm-context` | `template-near-private` | `no-copy` | `no` | `owner-approval-required` | Beispielkonfiguration bleibt secret-nah; nur nach Secret-Scan und expliziter Review als Pattern/Metadaten diskutierbar. |
| `memory/` | `private-or-local` | `mixed` | `no-copy` | `no` | `human-review-required` | Umbrella default locked, weil Memory private, operatorische, project- und runtime-nahe Ebenen vermischen kann. |
| `memory/scopes/` | `private-or-local` | `mixed` | `no-copy` | `no` | `human-review-required` | Scope-Notizen muessen einzeln freigegeben werden; keine pauschale Kontextaufnahme. |
| `memory/scopes/operator.md` | `exclude-from-llm-context` | `private` | `no-copy` | `no` | `exclusion-lock` | Operator memory ist privatheitsnah und default excluded. |
| `memory/stores/jsonl/` | `exclude-from-llm-context` | `local` | `no-copy` | `no` | `exclusion-lock` | Durable/local Store oder spaetere Eintraege duerfen nicht inhaltlich verarbeitet werden. |
| `memory/policies/` | `operational-playbook` | `operational` | `pointer-only` | `review-only` | `human-review-required` | Borderline-Ausnahme: Policy-Pointer moeglich, aber muss auf canonical Memory Contract verweisen. |
| `artifacts/runtime-runs/` | `runtime-evidence` | `generated` | `no-copy` | `no` | `exclusion-lock` | Raw runtime artifacts und Logs koennen private oder unreviewed Daten enthalten. |
| `runtime-state` | `runtime-evidence` | `generated` | `no-copy` | `no` | `human-review-required` | Lokaler Laufzeitstatus bleibt ausgeschlossen, bis redigierte Summaries freigegeben sind. |
| private logs | `exclude-from-llm-context` | `private` | `no-copy` | `no` | `exclusion-lock` | Nicht redigierte Runtime-/Tool-Logs koennen private oder transient Daten enthalten. |
| nicht freigegebene project imports | `project-import` | `unknown` | `no-copy` | `no` | `owner-approval-required` | Owner, Aktualitaet, Lizenz, Privatheit und Authority sind nicht geklaert. |
| `repo-skill-libraries/` | `project-import` | `unknown` | `no-copy` | `no` | `owner-approval-required` | Audit markiert den Bereich als externen/project import mit Review-Bedarf. |
| `*secret*` | `needs-human-review` | `unknown` | `no-copy` | `no` | `owner-approval-required` | Secret-nahe Pattern duerfen nicht kopiert oder zusammengefasst werden. |
| `*token*` | `needs-human-review` | `unknown` | `no-copy` | `no` | `owner-approval-required` | Token-nahe Pattern duerfen nicht kopiert oder zusammengefasst werden. |
| `*credential*` | `needs-human-review` | `unknown` | `no-copy` | `no` | `owner-approval-required` | Credential-nahe Pattern duerfen nicht kopiert oder zusammengefasst werden. |
| private keys | `exclude-from-llm-context` | `private` | `no-copy` | `no` | `exclusion-lock` | Schluesselmaterial darf nie in LLM-/Wiki-Kontext aufgenommen werden. |

## Exclusion Rationale

| Pattern / Path | Grund | Ausnahme moeglich? | Review-Bedingung |
|---|---|---|---|
| `.git/` | History, Diffs und Interna koennen private oder entfernte Inhalte enthalten. | ja | Nur konkrete Git-Review-Aufgabe mit begrenztem Befehl und Ergebniszusammenfassung. |
| `.codex/` | Lokaler Tool-State kann private Session- und Konfigurationsdaten enthalten. | nein, default | Nur ein konkret benanntes, nicht-sensibles Manifest nach ausdruecklicher Freigabe. |
| `.env*` | Secret-nahe Runtime-Konfiguration. | nein | Keine Inhaltsaufnahme; nur Pattern/Risiko nennen. |
| `.env.example` | Template, aber secret-nah und leicht fehlzuverwenden. | ja | Secret-Scan, Owner-Freigabe und nur redigierte Pattern-Metadaten. |
| `memory/` | Vermischt private, operatorische, project- und runtime-nahe Wissensebenen. | ja | Scope-Matrix und explizite Freigabe pro Unterpfad. |
| `memory/scopes/operator.md` | Operator-nahe Praeferenzen oder private Arbeitsweise. | ja, eng | Explizite Abschnittsfreigabe; default bleibt no-copy. |
| `memory/stores/jsonl/` | Durable/local Store kann Eintraege mit privatem Kontext enthalten. | nein, default | Nur Schema-/Policy-Pointer, keine Eintragsinhalte. |
| `memory/policies/` | Operational nutzbar, aber darf canonical Contract nicht ersetzen. | ja | Nur Pointer/Metadaten und Link auf `core/contracts/workflow-memory-contract.json`. |
| `artifacts/runtime-runs/` | Raw Laufzeitbelege und Logs koennen private oder unreviewed Daten enthalten. | ja, eng | Nur redigierte, reviewed Summary; keine Rohartefakte. |
| private logs | Transient, potentiell privat, nicht kanonisch. | ja, eng | Redaction, Zweck, Retention und Owner-Freigabe geklaert. |
| nicht freigegebene project imports | Ownership, Aktualitaet und Datenschutzstatus ungeprueft. | ja | Owner/License/Privacy/Authority Review abgeschlossen. |
| secret-nahe Patterns | Hohe Gefahr, Secrets oder rekonstruierbare Hinweise zu exponieren. | nein, default | Nur Kategorie und Risiko dokumentieren. |

## Borderline Review Gates

| Borderline Case | Default | Required Gate | Allowed Output After Approval |
|---|---|---|---|
| `memory/policies/` | `review-only` | Human Review plus canonical pointer check | Pointer-only Policy-Map mit Link auf `core/contracts/workflow-memory-contract.json`. |
| `memory/scopes/project.md` | `no` | Abschnittsfreigabe und Privatheitscheck | Redigierte Metadaten oder Pointer, keine Volltexte. |
| `memory/scopes/runtime.md` | `no` | Runtime/Privacy Review | Redigierte Metadaten oder Pointer, keine Laufzeitdetails. |
| `.env.example` in Templates | `no` | Secret-Scan plus Owner-Freigabe | Nur Kategorie/Pattern, keine Werte oder Vollkopie. |
| `artifacts/runtime-runs/` | `no` | Redaction Review plus Zweckbindung | Redacted-summary-only, niemals Rohartefakt. |
| `repo-skill-libraries/` | `no` | Project-import Review | Pointer-only nach Owner-/Lizenz-/Aktualitaetsklaerung. |
| private logs | `no` | Owner-Freigabe, Redaction, Retention-Entscheidung | Redacted-summary-only. |

## Pointer-Only References

- `Review Decisions` -> `audit/local-llm-wiki-review-decisions.md` - Entscheidungsmatrix fuer approve, review-only und exclude.
- `Path Mapping` -> `audit/local-llm-wiki-path-mapping.md` - Pfad-zu-Zone-Mapping und Exclusion-Regeln.
- `Canonical Memory Contract` -> `core/contracts/workflow-memory-contract.json` - nur als canonical Pointer fuer spaetere `memory/policies/`-Freigaben.

## Open / Review-Required

- [ ] Entscheiden, ob `memory/` als gesamter Umbrella im Overlay sichtbar bleiben darf oder nur einzelne reviewed Unterpfade.
- [ ] Entscheiden, ob `memory/policies/` als Pointer-only Operational Playbook in eine spaetere Map aufgenommen werden darf.
- [ ] Entscheiden, ob `.env.example` grundsaetzlich ausgeschlossen bleibt oder nach Secret-Scan als Pattern-Metadaten erscheinen darf.
- [ ] Entscheiden, ob runtime evidence ueberhaupt in ein Wiki darf oder nur in Audit-Artefakten mit Redaction.
- [ ] Entscheiden, ob project imports eine eigene Freigabe-/Owner-Matrix brauchen.

## Changelog

- `2026-05-09`: initial proposed - Codex Overlay-Generator, basierend nur auf Audit-/Decision-Artefakten und ohne Lesen ausgeschlossener Pfadinhalte.
