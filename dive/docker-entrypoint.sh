#!/bin/sh
# Schreibt den MotherDuck-Token als JS-Variable zur Laufzeit
# (Fly.io-Secret → config.js → window.MOTHERDUCK_TOKEN im Browser)
cat > /usr/share/nginx/html/config.js <<EOF
window.MOTHERDUCK_TOKEN = "${MOTHERDUCK_TOKEN}";
EOF
exec nginx -g "daemon off;"
