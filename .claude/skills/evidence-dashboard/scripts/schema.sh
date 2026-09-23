#!/usr/bin/env bash
# Echtes Schema der PulsCheck-DuckDB: Tabellen, Spalten, Zeilenzählern.
# Quelle der Wahrheit für Query-Generierung — Docs können altern, das hier nicht.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
DB="$ROOT/sources/pulscheck/pulscheck.duckdb"

if [ ! -f "$DB" ]; then
	echo "Fehler: DuckDB nicht gefunden: $DB" >&2
	exit 1
fi

python3 - "$DB" << 'EOF'
import sys
import warnings

warnings.filterwarnings("ignore")

import duckdb

con = duckdb.connect(sys.argv[1], read_only=True)

tables = [r[0] for r in con.execute(
    "select table_name from information_schema.tables "
    "where table_schema='main' order by table_name"
).fetchall()]

for t in tables:
    n = con.execute(f'select count(*) from main."{t}"').fetchone()[0]
    print(f"\n== {t}  ({n:,} Zeilen) ==")
    cols = con.execute(
        "select column_name, data_type from information_schema.columns "
        "where table_name = ? and table_schema='main' order by ordinal_position",
        [t],
    ).fetchall()
    for name, typ in cols:
        print(f"  {name:28s} {typ}")

print("\n-- Beispielzeilen pro Tabelle (je 2) --")
for t in tables:
    rows = con.execute(f'select * from main."{t}" limit 2').fetchall()
    for r in rows:
        print(f"{t}: {r}")
EOF
