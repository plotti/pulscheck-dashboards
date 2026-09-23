---
name: evidence-dashboard
description: Generiert eine neue Evidence-Dashboard-Page für PulsCheck (pages/<slug>.md) nach den Projektkonventionen - inklusive Schema-Grounding gegen die echte DuckDB und Build-Verifikation. Use when the user asks to create, generate, add or modify a dashboard, dashboard page, KPI view, chart, report or metric view for PulsCheck.
---

# Evidence-Dashboard generieren

Ein Befehl, ein Dashboard: Kontext laden → Page generieren → gegen den
echten Build verifizieren.

## Schritt 1 — Kontext-Stapel laden (verpflichtend, in dieser Reihenfolge)

1. `DASHBOARD_RULES.md` (Projektroot) — Layout-, Komponenten- und
   Filterkonventionen. **Verbindlich; nichts davon doppelt erfinden.**
2. `../pulscheck-analytics/RULES.md` — Geschäftslogik (MRR-Definition,
   SSOT-Regeln, Antworten-Standard). Pfade für andere Projekte unten.
3. `../pulscheck-analytics/docs/data_model.md` — Tabellen und Beziehungen.
4. `bash .claude/skills/evidence-dashboard/scripts/schema.sh` — **das
   tatsächliche** Schema der DuckDB (Tabellen, Spalten, Zeilenzählern).
   Das Datenmodell-Doc kann altern; die Datenbank nicht. Bei
   Widersprüchen gewinnt `schema.sh`.

Fehlt ein Kontextfile: nachfragen statt raten.

## Schritt 2 — Sicht klären

Prompt des Users gegenprüfen: Welche Frage beantwortet die Seite? Welche
BigValues, welche Charts, welche Filter? **Zeitfenster klären**: fixe
Stichtage (reproduzierbar, Stand dieser Fallstudie) oder relative
Zeiträume (`CURRENT_DATE`-basiert für echtes Reporting). Nur bei echten
Unklarheiten nachfragen — ein halbwegs spezifizierter Prompt reicht.

## Schritt 3 — Page schreiben

`pages/<slug>.md` (kebab-case). Konventionen aus `DASHBOARD_RULES.md`
sind verbindlich, insbesondere:

- Nur Komponenten aus der Whitelist; die «NICHT verwenden»-Liste ernst
  nehmen — es gibt keinen `<CohortHeatmap>`, kein `<EuropeMap>`.
- Tabellen immer schema-qualifizieren: `pulscheck.<tabelle>`.
- SSOT-Regeln aus RULES.md: MRR nur aus `subscriptions`,
  Paket-Umsatz nur aus `response_packages`, Antworten standardmässig
  `is_complete = true`.
- Filter per `<Dropdown>` mit Default `%` und
  `where … like '${inputs.<name>.value}'`.
- Erklärungstext **vor** dem Chart, Sie-Form, keine Marketing-Floskeln.
- Goldene Beispiele zum Format: die bestehenden Pages
  `pages/subscription_health.md` und `pages/package_sales.md`.

## Schritt 4 — Verifizieren (nicht optional)

```bash
bash .claude/skills/evidence-dashboard/scripts/verify.sh
```

Der Script baut die Site und **greppt das Build-Log nach Query-Fehlern**:
`evidence build` meldet Erfolg, selbst wenn einzelne Queries mit
Catalog Errors durchlaufen haben — der Exit-Code allein lügt. Bei
Fehlern: Query fixen, erneut verifizieren. Erst wenn der Script sauber
durchläuft, ist die Page fertig. Ausgabe dem User zeigen ( Pfad,
Queries-Kurzbeschreibung, Verifikationsergebnis, offene Punkte).

## Portabilität auf andere Projekte

Projekt-spezifisch sind genau drei Dinge:

1. **Kontextpfade** (Schritt 1): `DASHBOARD_RULES.md` im Projektroot,
   `RULES.md` + `docs/data_model.md` im Schwesterprojekt.
2. **Die Datenbank** in `scripts/schema.sh` (Pfad zur DuckDB/DB).
3. **Der Build-Befehl** in `scripts/verify.sh`.

Das Muster ist universal: Conventions-File als verbindliche Quelle,
Schema-Grounding gegen die echte DB statt gegen vielleicht veraltete
Docs, und ein Verifizierer, der Build-Logs liest statt Exit-Codes zu
vertrauen. SKILL.md kopieren, die drei Punkte anpassen, fertig.
