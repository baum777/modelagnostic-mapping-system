# Qwen 3.x / Qwen 3.6: Fähigkeiten, Best Practices und Tool-gestützte Workflows

Class: derived.
Use rule: read this as a reviewed guide for prompt design and agent workflows; do not treat it as canonical truth for Qwen product claims or feature availability.

Hinweis: Diese Fassung ist eine redaktionell überarbeitete Version eines bereitgestellten Drafts. Aussagen zu Qwen3, Qwen3.6-Plus und Qwen Code sind hier als externe Produktclaims zu lesen, nicht als im Repo verifizierte Wahrheit.

## 1. Einordnung

Der Draft unterscheidet drei Ebenen:

- **Qwen3** als Modellgeneration
- **Qwen3.6-Plus** als gehosteter Modellstand mit Fokus auf agentische Nutzung
- **Qwen Code** als CLI-/IDE-Umgebung, in der Qwen-Modelle praktisch eingesetzt werden

Praktisch ist die sinnvolle Einheit nicht das Modell allein, sondern der Arbeitsablauf aus:

1. Analyse
2. Planung
3. Tool-Nutzung
4. Auswertung
5. Anpassung

Je mehr Kontext, Dateien und Werkzeuge verfügbar sind, desto eher kann so ein Modell in einen produktiven Arbeitsmodus kommen. Ohne diese Umgebung bleibt der Nutzen meist bei generischer Textgenerierung.

## 2. Was der Draft Qwen zuschreibt

Der Text positioniert Qwen vor allem in diesen Bereichen:

- Instruction Following
- Reasoning und Planung
- Coding und agentische Aufgaben
- Tool-Calling
- Mehrsprachigkeit
- längere Kontexte

Für Qwen3.6-Plus wird das im Draft weiter zugespitzt:

- stärkere Verbindung von Reasoning, Memory und Execution
- bessere agentische Coding-Leistung
- stärkere Tool-Nutzung
- längerer nutzbarer Kontext
- bessere Leistung bei mehrstufigen Aufgaben

Ein belastbarer praktischer Schluss daraus ist nicht, dass das Modell automatisch „besser“ ist, sondern dass es sich besonders für Workflows eignet, in denen Antwort, Tool-Einsatz und Nacharbeit eng zusammenhängen.

## 3. Praktische Einordnung

Für die tägliche Arbeit ist Qwen dann nützlich, wenn es nicht nur einen Prompt beantwortet, sondern einen Arbeitsauftrag begleitet.

Besonders relevant sind Aufgaben mit:

- klarer Zieldefinition
- strukturierter Tool-Nutzung
- mehreren Zwischenschritten
- sichtbaren Artefakten wie Dateien, Logs, Diffs oder Plänen

Weniger geeignet ist ein vager Prompt ohne Scope, Qualitätsgrenzen oder Ausgabestruktur. Dann liefert das Modell zwar Text, aber keine verlässliche Arbeitsform.

## 4. Wo der Ansatz laut Draft am stärksten ist

### Coding und Repo-Arbeit

Geeignet für:

- Codebase-Verständnis
- Refactor-Planung
- Bug-Isolation
- kleine bis mittlere Implementierungen
- Test- und Fix-Loops
- Release-Vorbereitung
- CI/CD-nahe Aufgaben
- Automatisierung wiederkehrender Engineering-Schritte

### Agentische Workflows

Geeignet, wenn Aufgaben nicht linear sind, sondern über mehrere Teilschritte laufen:

- Dateien lesen und ändern
- Shell-Kommandos ausführen
- Webinformationen abrufen
- MCP-Tools nutzen
- Arbeitspläne erzeugen
- Teilaufgaben kapseln oder parallelisieren

### Wissens- und Arbeitskontext

Mit Tool-Zugriff wird der Ansatz auch für strukturierte Wissensarbeit interessant:

- interne Doku
- Ticketsysteme
- Design- und Produktartefakte
- externe Wissensquellen
- datenbankgestützte Analysen
- operative Team-Workflows

## 5. Best Practices im Prompting

### 5.1 Rolle, Ziel, Scope und Grenzen explizit machen

Ein guter Prompt benennt mindestens:

- Rolle
- Ziel
- Arbeitsmodus
- Grenzen
- Ausgabeformat

Beispiel:

```text
Du bist ein Analyse-Agent.

Ziel:
- Verstehe die bestehende Realität und identifiziere die wahrscheinlichste Ursache des Problems.

Arbeitsmodus:
- read-only
- keine Änderungen

Grenzen:
- keine Neudesigns
- keine Spekulation ohne Beleg
- keine Annahmen über nicht geprüfte Runtime-Zustände

Ausgabe:
1. Ergebnis
2. Beobachtete Realität
3. Root-Cause-Kandidaten
4. Wahrscheinlichste Ursache
5. Nächste minimale Prüf- oder Fix-Schritte
```

### 5.2 Arbeitsmodus präzise setzen

Bei agentischen Clients ist der Modus oft wichtiger als die Wortwahl im Prompt:

- **Plan/Read-only** für Analyse, Review und Kontextaufnahme
- **Normal** für gemischte Aufgaben
- **Edit** nur, wenn die Änderung klein und sicher ist
- **breit schreibende Automatisierung** nur mit klaren Grenzen

### 5.3 Aufgaben in Stufen zerlegen

Stabiler ist ein Ablauf wie:

1. Problem verstehen
2. Befunde strukturieren
3. Plan erstellen
4. Erst dann umsetzen
5. Danach validieren

Das ist robuster als ein einzelner Prompt, der Analyse, Design, Umsetzung und Validierung gleichzeitig verlangt.

### 5.4 Evidenz verlangen

Gerade bei großen Repos oder komplexen Systemen sollte jede starke Aussage an konkrete Belege gebunden sein:

- Dateipfade
- Symbole oder Funktionen
- Kommandos
- Logs
- Diffs

Hilfreich ist die explizite Trennung zwischen:

- beobachteter Realität
- begründeter Inferenz
- Empfehlung

### 5.5 Format standardisieren

Qwen-Workflows werden besser, wenn das Zieloutput feststeht:

- nummerierte Entscheidungsblöcke
- Vergleichsmatrizen
- Review-Formate
- Checklisten
- JSON nur bei maschineller Weiterverarbeitung

### 5.6 Nicht nur erzeugen, sondern prüfen lassen

Prompts sollten Validierung direkt mit anfordern:

- Prüfe, ob der Fix die Architektur verletzt.
- Nenne fehlende Tests.
- Bewerte Regression-Risiken.
- Markiere offene Unsicherheiten.

## 6. Robustes Prompt-Framework

Ein praxistaugliches 6-Block-Schema ist:

1. **Kontext**  
   Worum geht es?
2. **Zielzustand**  
   Was soll am Ende konkret vorliegen?
3. **Arbeitsmodus**  
   Analyse, Planung, Edit, Review, Automation oder Research.
4. **Grenzen**  
   Was ist verboten oder außerhalb des Scopes?
5. **Qualitätskriterien**  
   Woran erkennt man ein gutes Ergebnis?
6. **Ausgabeformat**  
   Wie soll das Ergebnis strukturiert sein?

Beispiel:

```text
Kontext:
Wir arbeiten in einem produktiven Software-Repo mit bestehender Governance.

Ziel:
Identifiziere die wahrscheinlichste Ursache für den Fehler im lokalen Papertrade-Start.

Arbeitsmodus:
Analyse zuerst, keine Änderungen.

Grenzen:
- Keine Architektur-Neuentwürfe
- Keine Annahmen ohne Beleg
- Keine Änderungen an Secrets oder Deploy-Konfigurationen

Qualitätskriterien:
- Konkrete Dateipfade
- Klare Kausalkette
- Minimale, realistische Fix-Empfehlungen

Ausgabe:
1. Ergebnis
2. Repo-Realität
3. Root-Cause-Kandidaten
4. Empfohlene nächste Schritte
5. Offene Unsicherheiten
```

## 7. Qwen Code als Arbeitsumgebung

Der Draft beschreibt Qwen Code als agentische Arbeitsumgebung, nicht nur als Chatoberfläche. Wenn die jeweilige Umgebung diese Funktionen tatsächlich bereitstellt, sind folgende Bausteine relevant:

- Arbeiten im Terminal
- Dateien lesen und editieren
- Kommandos ausführen
- Webzugriff
- Projektkontext
- Commits vorbereiten
- externe Systeme über MCP anbinden
- Headless Mode für Automatisierung
- Approval Modes für kontrolliertes Arbeiten

### 7.1 Plan Mode

Gut für:

- read-only Analyse
- komplexe Refactor-Planung
- Architektur- und Sicherheitsreviews
- Kontextaufnahme vor Änderungen

### 7.2 Approval- und Permission-Modi

Für unbekannte Projekte sollte die Schreibfreiheit eher restriktiv starten und erst nach sauberer Kontextaufnahme erweitert werden.

### 7.3 MCP

MCP ist der Hebel für echte Tool-Nutzung:

- Repositories
- interne APIs
- Datenbanken
- Ticketing-Systeme
- Wissensquellen
- eigene Toolchains

### 7.4 Hooks

Hooks sind sinnvoll, wenn Governance und Workflow-Regeln technisch erzwungen werden sollen:

- Tests vor Aktionen
- Security- oder Policy-Prüfungen
- zusätzliche Projektkontexte
- Tool-Nutzung auditieren
- Ausgabeformate normalisieren

### 7.5 Headless Mode

Geeignet für standardisierte, nicht-interaktive Abläufe:

- Release Notes
- Log- und Report-Auswertung
- standardisierte Reviews
- wiederholbare Repo-Prüfungen
- Folgeprompts in Skripten

### 7.6 Skills, Extensions und Subagents

Der relevante Gedanke ist Wiederverwendbarkeit. Ein Skill ist dann sinnvoll, wenn er:

- klaren Zweck hat
- definierte Eingaben erwartet
- explizite Grenzen hat
- eine stabile Ausgabestruktur liefert
- optional Tool-Nutzung kapselt

## 8. Wie man „Skills“ sinnvoll versteht

Ein Skill ist in diesem Modell kein bloßer Prompt-Schnipsel, sondern ein wiederverwendbares Handlungsmodul.

Typische Beispiele:

- **Repo Intake Skill**  
  Erfasst Struktur, Entry Points, Build- und Test-Skripte sowie relevante Umgebungsdateien.

- **Patch Review Skill**  
  Trennt Risk, Correctness, Architecture und Regression.

- **Runbook Skill**  
  Erzeugt oder prüft Schritt-für-Schritt-Abläufe.

- **Migration Skill**  
  Überträgt Workflows in eine neue Zielumgebung.

- **Governance Skill**  
  Erzwingt Source-of-Truth-, Scope- und Approval-Regeln.

## 9. Gute und schlechte Workflows

### Schwach

- vage Rolle
- unklarer Scope
- keine Evidenzpflicht
- alles gleichzeitig: analysieren, designen, implementieren, validieren
- keine Tool-Grenzen
- keine Permission-Kontrolle

### Stark

- klare Phasen
- klarer Modus
- explizite Grenzen
- konkrete Artefakte als Ziel
- evidenzbasierte Zwischenstände
- Tool-Zugriff nur dort, wo nötig
- wiederverwendbare Skills und Commands
- Automatisierung nur für stabile Teilaufgaben

## 10. Praktische Vorlagen

### Vorlage 1: Read-only Analyse

```text
Du bist ein senioriger Analyse-Agent für Software- und Systemdiagnostik.

Ziel:
Verstehe die bestehende Realität und identifiziere die wahrscheinlichste Ursache des Problems.

Arbeitsmodus:
- read-only
- keine Änderungen
- nenne konkrete Dateien, Symbole und Kommandos

Grenzen:
- keine Neudesigns
- keine Spekulation ohne Beleg
- keine Annahmen über nicht geprüfte Runtime-Zustände

Ausgabe:
1. Ergebnis
2. Beobachtete Realität
3. Root-Cause-Kandidaten
4. Wahrscheinlichste Ursache
5. Nächste minimale Prüf- oder Fix-Schritte
```

### Vorlage 2: Plan vor Umsetzung

```text
Arbeite in zwei Phasen.

Phase 1:
Erstelle einen präzisen Umsetzungsplan mit betroffenen Dateien, Risiken und Validierungsschritten.

Phase 2:
Setze erst nach klarer Planstruktur um.

Wichtig:
- bevorzuge minimal-invasive Änderungen
- bewahre bestehende Architekturgrenzen
- nenne explizit, was du nicht ändern wirst
```

### Vorlage 3: Tool-orientierter Workflow

```text
Nutze verfügbare Tools gezielt.

Priorität:
1. lokale Repo-Realität
2. Projektkonfiguration
3. externe Doku nur zur Bestätigung

Regeln:
- jede externe Aussage klar von Repo-Realität trennen
- Tool-Nutzung nur dann, wenn sie Unsicherheit reduziert
- Ergebnis in Pass/Fail + Risiken + Empfehlungen formatieren
```

### Vorlage 4: Governance-Agent

```text
Du agierst als governance-first Review-Agent.

Prüfe:
- Scope-Verletzungen
- Authority-Leaks
- nicht belegte Annahmen
- stille Architekturverschiebungen
- fehlende Validierung

Antworte in dieser Struktur:
1. Urteil
2. Belegte Befunde
3. Risiken
4. Blocker
5. Freigabefähige nächste Schritte
```

## 11. Empfohlene Nutzungsstrategie

### Für Einsteiger

- mit Plan Mode beginnen
- kleine, klar begrenzte Aufgaben geben
- Ausgabeformate standardisieren
- MCP, Hooks und Automatisierung erst später hinzufügen

### Für Fortgeschrittene

- wiederverwendbare Prompt-Templates anlegen
- Skills für wiederkehrende Aufgaben definieren
- Hooks für Policy und Testdisziplin einsetzen
- Headless Mode für Standard-Workflows nutzen

### Für Teams

- klare Skill-Bibliothek aufbauen
- Approval-Modi bewusst definieren
- Hook-basierte Guardrails einsetzen
- Standard-Outputs für Reviews, Patches, Runbooks und Audits normieren
- Mensch-in-der-Schleife bei commit-kritischen Änderungen beibehalten

## 12. Fazit

Der produktive Wert liegt nicht nur im Modell, sondern in der Kombination aus:

- klaren Prompts
- sauberem Arbeitsmodus
- Tool-Zugriff über MCP
- workflow-seitigen Guardrails
- wiederverwendbaren Skills
- kontrollierter Automatisierung

Am stärksten ist der Ansatz dort, wo Aufgaben sauber in Analyse, Planung, Umsetzung und Validierung getrennt werden und das Modell nicht nur „Antworten schreibt“, sondern prüfbare Arbeit in strukturierten Abläufen unterstützt.

## 13. Offene Punkte

Wenn dieser Text als dauerhafte Anleitung genutzt werden soll, sollten die folgenden Punkte separat geklärt werden:

- Welche Qwen-Code-Funktionen sind im Zielsystem tatsächlich verfügbar?
- Welche Produkt-Claims sind intern belegt und welche bleiben externe Aussagen?
- Wo liegt die kanonische Quelle für client- oder provider-spezifische Funktionen?
- Soll daraus ein Guide, ein Skill oder nur ein Knowledge Asset werden?

