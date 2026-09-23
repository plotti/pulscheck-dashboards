# PulsCheck Dashboards – Evidence Demo Project

Begleitprojekt zum Blogbeitrag **„Agentic Dashboards mit Evidence statt
Tableau-Beratung"**. Drei vollständige Dashboards für die fiktive Schweizer
Survey-SaaS-Firma PulsCheck AG, gebaut mit [Evidence](https://evidence.dev)
und einer DuckDB-Datenquelle.

## Was hier drin ist

```text
pulscheck-dashboards/
├── README.md
├── DASHBOARD_RULES.md         # Konventionen für Claude-gestützte Generierung
├── build_duckdb.py            # SQLite (aus Schwesterprojekt) → DuckDB
├── package.json
├── evidence.config.yaml
├── pages/
│   ├── index.md               # Übersicht + KPI-Header + Links
│   ├── subscription_health.md # Dashboard 1: MRR, Churn, Retention
│   ├── package_sales.md       # Dashboard 2: Paket-Umsatz S/M/XL nach Land
│   └── survey_engagement.md   # Dashboard 3: Sprache, Geo, Antwortdauer
└── sources/
    └── pulscheck/
        ├── connection.yaml    # DuckDB-Quelle
        ├── pulscheck.duckdb   # die Daten
        └── *.sql              # eine Source-Query pro Tabelle
```

## Verbindung zum Schwesterprojekt

Dieses Projekt nutzt dieselbe Datenwahrheit wie das
`pulscheck-analytics`-Projekt (das nao-Projekt aus dem ersten Blogbeitrag).
Konkret:

- `build_duckdb.py` synchronisiert die DuckDB-Datenbank des
  nao-Projekts (`../pulscheck-analytics/pulscheck.duckdb`) in dieses
  Repo (`sources/pulscheck/pulscheck.duckdb`).
- Geschäftsregeln aus `RULES.md` des nao-Projekts gelten unverändert weiter
  (MRR-Definition, Single-Source-of-Truth-Regeln, Churn-Logik).
- Die `DASHBOARD_RULES.md` in diesem Projekt ergänzt nur Layout- und
  Komponenten-Konventionen, die für Evidence spezifisch sind.

## Quickstart

Voraussetzungen: **Node ≥ 18** und **Python ≥ 3.10** mit `duckdb`-Paket.

```bash
# 1. Datenquelle aus dem nao-Projekt aufbauen (nur nötig, falls keine
#    pulscheck.duckdb mitgeliefert ist)
pip install duckdb
python build_duckdb.py

# 2. Evidence-Dependencies installieren (~30 s, viele Pakete)
npm install

# 3. Dev-Server starten – öffnet http://localhost:3000 automatisch
npm run sources   # einmalig nach Daten-Refresh
npm run dev
```

Für einen produktiven Static-Site-Build:

```bash
NODE_OPTIONS="--max-old-space-size=6144" npm run build
# Ausgabe in ./build – kann auf Cloudflare Pages, Vercel, Netlify deployed werden
```

> **Speicher-Hinweis:** Evidence-Builds brauchen etwa 4–6 GB RAM für ein
> Projekt dieser Grösse (3 Dashboards, ~280k Zeilen Daten). Auf Maschinen
> mit weniger RAM hilft das `NODE_OPTIONS`-Setting oben.

## Branding (PulsCheck AG)

Das Dashboard ist als PulsCheck-Produkt gebrandet. Drei Bausteine:

1. **`static/`** – Wordmark, Favicon und Icons (`wordmark.svg`, `icon.svg`,
   `favicon.ico`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`).
   Evidence kopiert `static/` bei jedem Build automatisch ins Template
   und ersetzt damit die Evidence-Standarddateien.
2. **`scripts/apply-branding.sh`** – `evidence build` kopiert das App-Template
   bei jedem Lauf neu aus `node_modules`, eine lokale Kopie würde also
   jedes Mal das Evidence-Logo zurückbringen. Deshalb patcht das Skript
   (idempotent) die Layout-Datei direkt im Paket: Header/Mobile-Drawer
   zeigen das PulsCheck-Wordmark, der «Built with Evidence»-Hinweis
   entfällt. Läuft automatisch per `postinstall`-Hook; nach manuellen
   `npm install`-Läufen ist nichts weiter nötig.
3. **Index-Footer** – Copyright-Zeile «© 2026 PulsCheck AG · Zürich»
   unten auf der Startseite.

## Claude Skill: `evidence-dashboard`

Unter `.claude/skills/evidence-dashboard/` liegt ein Claude Skill, der
das Generieren neuer Dashboard-Pages zu einem einzigen Befehl macht
(`/evidence-dashboard <Beschreibung der gewünschten Sicht>`):

1. **Kontext-Stapel laden** – `DASHBOARD_RULES.md`,
   `../pulscheck-analytics/RULES.md` und `docs/data_model.md`, plus
   `scripts/schema.sh`: das **tatsächliche** Schema der DuckDB
   (Tabellen, Spalten, Zeilenzähler) als Quelle der Wahrheit.
2. **Page generieren** – `pages/<slug>.md` nach den Konventionen
   (Komponenten-Whitelist, `pulscheck.`-Präfix, SSOT-Regeln,
   Filter-Muster `%` + `like`).
3. **Verifizieren** – `scripts/verify.sh` baut die Site und greppt das
   Log nach Query-Fehlern. `evidence build` meldet nämlich Erfolg,
   selbst wenn einzelne Queries mit Catalog Errors durchlaufen sind –
   der Exit-Code allein lügt.

Übertragbar auf andere Projekte: SKILL.md kopieren, Kontextpfade,
Datenbankpfad (schema.sh) und Build-Befehl (verify.sh) anpassen.

## Erwartete Ergebnisse (Seed=42, Stichtag 2026-04-30)

Wenn alles richtig gebaut ist, sehen Sie:

- **Index** – aktuelles MRR rund 51'000 CHF (alle aktiven Subs ohne Stichtag-Filter), ca. 2'558 `subscription_active`-Kund:innen, ca. 169'540 vollständige Antworten total.
- **Subscription Health** – MRR Ende April: **57'331.32 CHF** über **2'868 aktive Subscriptions**. Plan-Verteilung dominiert von `subscription_active` (ca. 2'558 Kund:innen).
- **Package Sales** – Q1-Sieger im 90-Tage-Fenster ist Paket **M** mit rund 43.6 % Umsatzanteil.
- **Survey Engagement** – Deutsch dominiert die Sprachverteilung, Antwortdauer-Schwerpunkt im 5–10-Minuten-Bucket.

Diese Werte sind durch den fixen Random-Seed im
Schwesterprojekt-Seed-Skript reproduzierbar.

## Wie wurden die Dashboards erstellt?

Nicht per Klick. Jede Page wurde mit Claude generiert auf Basis von:

1. `RULES.md` aus dem nao-Projekt (Geschäftsregeln, MECE).
2. `docs/data_model.md` aus dem nao-Projekt (Tabellen, Beziehungen).
3. `DASHBOARD_RULES.md` aus diesem Projekt (Layout, Komponenten, Konventionen).
4. Einem konkreten Prompt pro Dashboard mit der gewünschten Sicht.

Das war keine 1-Shot-Generierung – wie im Beitrag beschrieben, gab es
mehrere Iterationen, in denen z. B. nicht-existierende Komponenten
korrigiert oder Single-Source-of-Truth-Verstösse zurückgenommen wurden.

## Lizenz

Demo-Code zu Lehrzwecken. Daten sind synthetisch und enthalten keine
echten personenbezogenen Informationen.
