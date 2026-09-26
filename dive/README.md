# PulsCheck Dive — React + SQL + DuckDB WASM

Ein MotherDuck-Dive im Lokalmodus: dieselbe Architektur wie [Dives](https://motherduck.com/product/dives/)
— React rendert, SQL rechnet, und die DuckDB läuft als WebAssembly **im Browser**
(Dual-Execution-Prinzip: die Daten werden einmal geladen, alle Filter-Interaktionen
laufen danach client-seitig in wenigen Millisekunden).

## Starten

```bash
cd dive
npm install
npm run dev        # http://localhost:5173
```

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/queries.js` | **sämtliches SQL** an einem Ort — auditierbar, versionierbar |
| `src/duckdb.js` | DuckDB-WASM-Initialisierung, Parquet-Load, Views als `pulscheck.<tabelle>` |
| `src/App.jsx` | Layout: Filter, KPI-Kacheln, Sections |
| `src/charts.jsx` | Recharts-Charts (Dive-Default-Charting) |
| `scripts/export_data.py` | exportiert die 6 Tabellen aus `sources/pulscheck/pulscheck.duckdb` nach `public/data/*.parquet` |

## Weg zur echten MotherDuck-Dive

Das SQL in `src/queries.js` und die Chart-Struktur lassen sich 1:1 in eine echte
Dive überführen: MotherDuck-MCP-Connector im Agent verbinden, `pulscheck.duckdb`
als MotherDuck-Database anlegen, und den Agent mit „create a MotherDuck dive"
auf dieses Query-Set loslassen. Einbetten (Embed) geht danach per gesandboxtem
iframe mit kurzlebigem Token — siehe MotherDuck-Doku „Embedding Dives".
