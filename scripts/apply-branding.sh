#!/usr/bin/env bash
# PulsCheck-Branding: patcht die Layout-Datei im Evidence-Paket.
#
# `evidence build/dev` kopiert das Template bei jedem Lauf aus
# node_modules/@evidence-dev/evidence/template nach .evidence/template –
# jede nicht-gebrandete Kopie würde das Evidence-Logo rendern. Deshalb
# patchen wir die QUELLE in node_modules (idempotent):
#
#   - Header/Mobile-Drawer zeigen /wordmark.svg (aus static/)
#   - der «Built with Evidence»-Hinweis entfällt
#
# Läuft automatisch per `postinstall`-Hook (package.json).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAYOUT="$ROOT/node_modules/@evidence-dev/evidence/template/src/pages/+layout.svelte"

if [ ! -f "$LAYOUT" ]; then
	echo "apply-branding: $LAYOUT nicht gefunden – übersprungen (Paket noch nicht installiert?)"
	exit 0
fi

BRANDED='<EvidenceDefaultLayout {data} logo="/wordmark.svg" builtWithEvidence={false}>'

if grep -qF "$BRANDED" "$LAYOUT"; then
	echo "apply-branding: bereits gepatcht"
	exit 0
fi

perl -pi -e 's|<EvidenceDefaultLayout \{data\}>|<EvidenceDefaultLayout {data} logo="/wordmark.svg" builtWithEvidence={false}>|' "$LAYOUT"

if grep -qF "$BRANDED" "$LAYOUT"; then
	echo "apply-branding: Evidence-Layout gebrandet (Wordmark + kein Built-with-Evidence-Badge)"
else
	echo "apply-branding: WARNUNG – Patch fehlgeschlagen, Template-Format geändert?" >&2
	exit 1
fi
