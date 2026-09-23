# PulsCheck Dashboard-Konventionen

> Kontextfile für Claude. Wird zusammen mit `RULES.md` (Geschäftslogik) und
> `docs/data_model.md` aus dem nao-Projekt geladen, wenn neue Dashboards
> generiert werden sollen.

## Sprache und Tonalität

- Alle Texte auf Deutsch (Sie-Form), keine Marketing-Floskeln.
- Datums- und Zeitangaben in Europe/Zurich.
- CHF-Beträge mit Tausendertrennzeichen (`'`), Format `#,##0` für ganze Zahlen.

## Layout-Konventionen

- Jede Page beginnt mit H1 (Dashboard-Titel) und einem kurzen Lead-Satz, der den Inhalt einordnet.
- BigValue-Komponenten oben (max. vier nebeneinander), darunter Charts, optional DataTable am Ende.
- Sektion pro thematischer Frage – mit H2-Überschrift.
- Erklärungstexte direkt vor dem zugehörigen Chart, nicht danach.

## Verfügbare Evidence-Komponenten (Stand Mai 2026)

Verwende ausschliesslich diese Komponenten:

- `BigValue`, `LineChart`, `BarChart`, `AreaChart`, `ScatterPlot`
- `DataTable`, `Column` (innerhalb von DataTable)
- `Heatmap`, `Histogram`
- `Dropdown`, `DropdownOption` (für Filter)
- `Details`, `Alert`, `Tabs` (Layout-Helfer)

**NICHT verwenden** (Claude erfindet diese gelegentlich – sie existieren nicht):

- `CohortHeatmap` → Cohort-Analysen via `DataTable` mit Retention-Spalten oder `Heatmap` mit `grouping` bauen
- `DrillDownChart` → alle Charts sind statisch; Interaktivität ausschliesslich über `<Dropdown>`-Filter
- `WaterfallChart` → mit `BarChart` und negativen Werten emulieren
- `EuropeMap` / `USMap` → für Geo-Visualisierung den Country-Code als x-Achse in einem horizontalen `BarChart` (`swapXY=true`) zeigen, bis Evidence eine Map-Komponente nativ unterstützt

## Datenquelle

- Alle Queries gegen die DuckDB-Source `pulscheck` (Beispiel: `pulscheck.customers`).
- Geschäftsregeln aus `RULES.md` sind verbindlich:
  - MRR ausschliesslich aus `subscriptions.monthly_price_chf`, niemals Paket-Umsatz hinzurechnen.
  - Paket-Umsatz ausschliesslich aus `response_packages.price_chf`, niemals zusätzlich aus `invoices` (das wäre Doppelzählung).
  - Antworten-Standard ist `is_complete = true`, ausser explizit anders gefragt.
  - „Aktive Subscription im Zeitraum" = `started_at < period_start AND (canceled_at IS NULL OR canceled_at > period_end)`.

## Filter-Konventionen

- Country-Selector mit Default `%` (alle Länder), genutzt via `where country like '${inputs.country.value}'`.
- Zeitraum-Selektoren: bevorzugt mit fixen Optionen (letzte 30/90 Tage, dieses Jahr) statt freie Date-Picker, weil das die SQL-Komplexität reduziert.
- Filter-Werte werden als String-Interpolation in SQL referenziert: `${inputs.<name>.value}`.

## Performance

- Bei Aggregationen über mehr als 50'000 Zeilen prüfen, ob ein vorgefertigtes dbt-Modell sinnvoller wäre.
- Heavy queries niemals direkt in mehrere Charts einbinden – einmal als CTE definieren, mehrmals referenzieren.
- `select *` vermeiden – nur die wirklich benötigten Spalten ziehen, das spart Build-Zeit erheblich.

## Code-Stil in den Markdown-Pages

- SQL-Blöcke kleinschreiben (`select`, `from`, `where`), Spalten- und Tabellennamen ebenfalls.
- Komponenten-Attribute in einer eigenen Zeile pro Attribut, wenn mehr als drei.
- String-Konstanten in einfachen Anführungszeichen.

## Verbotene Pattern

- Keine harten Datumsstrings ohne Zeitzonen-Offset (`+01:00` / `+02:00`).
- Keine `select` ohne `where`-Filter über grosse Tabellen.
- Keine inline JavaScript-Berechnungen im Frontmatter (`{new Date()...}`) – stattdessen aus den Daten ableiten oder als Lead-Satz dokumentieren.
