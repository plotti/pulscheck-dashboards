"""
Synchronisiert die DuckDB-Datenbank aus dem nao-Projekt
(pulscheck-analytics) in das Source-Verzeichnis dieses Projekts.

Die Dashboards lesen die Daten ausschliesslich über
sources/pulscheck/pulscheck.duckdb – dieses Skript hält die Kopie
aktuell. Die Quelle erzeugt seed.py im Schwesterprojekt
(deterministisch, seed=42).

Ausführen nach jedem Daten-Refresh des Schwesterprojekts,
danach hier: `npm run sources` und `npm run build`.
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT.parent / "pulscheck-analytics" / "pulscheck.duckdb"
DST = ROOT / "sources" / "pulscheck" / "pulscheck.duckdb"

assert SRC.exists(), f"Quelldatenbank nicht gefunden: {SRC}"

DST.unlink(missing_ok=True)
shutil.copy2(SRC, DST)

print(f"Kopiert: {SRC}")
print(f"      -> {DST}")
print(f"Grösse: {DST.stat().st_size / 1024 / 1024:.1f} MB")
