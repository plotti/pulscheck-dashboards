#!/usr/bin/env python3
"""Exportiert die 6 PulsCheck-Tabellen als Parquet nach dive/public/data/.

Das ist die "erste Abfrage vom Server": Die Dive-App lädt diese Dateien einmal
beim Start in DuckDB-WASM und rechnet alle Filter-Interaktionen danach
ausschliesslich im Browser (Dual-Execution-Prinzip, lokal).
"""

import pathlib

import duckdb

ROOT = pathlib.Path(__file__).resolve().parents[2]
DB = ROOT / "sources" / "pulscheck" / "pulscheck.duckdb"
OUT = ROOT / "dive" / "public" / "data"

TABLES = [
    "customers",
    "invoices",
    "response_packages",
    "subscriptions",
    "survey_responses",
    "surveys",
]

OUT.mkdir(parents=True, exist_ok=True)

con = duckdb.connect(str(DB), read_only=True)

for t in TABLES:
    target = OUT / f"{t}.parquet"
    con.execute(
        f"copy (select * from pulscheck.{t}) to '{target}' (format parquet)"
    )
    n = con.execute(f"select count(*) from pulscheck.{t}").fetchone()[0]
    print(f"{t}: {n:,} Zeilen -> {target.name} ({target.stat().st_size / 1e6:.1f} MB)")
