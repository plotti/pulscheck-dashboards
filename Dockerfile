# PulsCheck Dashboards – statischer Evidence-Build hinter nginx.
# Der Build läuft lokal (braucht 4–6 GB RAM, zu viel für Flys Remote-Builder):
#   NODE_OPTIONS="--max-old-space-size=6144" npm run build
# Dieses Image dient nur das Fertige aus.

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY build/ /usr/share/nginx/html

EXPOSE 8080
