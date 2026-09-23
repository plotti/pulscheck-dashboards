#!/usr/bin/env bash
# Baut die Evidence-Site und prüft das Build-Log auf Query-Fehler.
#
# Wichtig: `evidence build` meldet Erfolg (Exit 0), selbst wenn einzelne
# Page-Queries mit Catalog Errors durchlaufen sind. Deshalb zählt hier
# das Log, nicht der Exit-Code.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

LOG="$(mktemp /tmp/evidence-build.XXXXXX.log)"
trap 'rm -f "$LOG"' EXIT

echo "==> Build läuft (kann 1–3 Minuten dauern)…"
if ! NODE_OPTIONS="--max-old-space-size=6144" npm run build > "$LOG" 2>&1; then
	echo "✗ Build fehlgeschlagen (harter Fehler). Letzte Zeilen:" >&2
	tail -30 "$LOG" >&2
	exit 1
fi

ERRORS=$(grep -E "Error in Query|Catalog Error|Parser Error|Binder Error|IO Error" "$LOG" || true)

if [ -n "$ERRORS" ]; then
	echo "✗ Build lief durch, ABER Queries sind fehlgeschlagen:" >&2
	echo "$ERRORS" >&2
	echo "\nBetroffene Queries im Log:" >&2
	grep -B2 -A4 "Error in Query" "$LOG" | head -60 >&2
	exit 1
fi

if grep -q "Build complete" "$LOG"; then
	echo "✓ Build sauber, keine Query-Fehler. Output: ./build"
else
	echo "⚠ Kein 'Build complete' im Log — manuell prüfen:" >&2
	tail -15 "$LOG" >&2
	exit 1
fi
