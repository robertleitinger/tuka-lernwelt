#!/bin/sh
# Vor jedem Veröffentlichen ausführen. Erhöht die Versionsnummer in version.json und in allen Seiten.
# Dann sieht Lea in einer offenen App unten den Knopf "Neu laden".
set -e
cd "$(dirname "$0")"
alt=$(sed -n 's/.*"v": *\([0-9][0-9]*\).*/\1/p' version.json)
neu=$((alt + 1))
printf '{"v": %s}\n' "$neu" > version.json
find . -name '*.html' -not -path './.git/*' -exec sed -i "s/<meta name=\"app-version\" content=\"[0-9]*\">/<meta name=\"app-version\" content=\"$neu\">/" {} +
fehlt=$(grep -L 'name="app-version"' $(find . -name '*.html' -not -path './.git/*') | xargs grep -L 'http-equiv="refresh"' || true)
[ -n "$fehlt" ] && echo "Achtung, ohne Versionszeile: $fehlt"
echo "Version $neu"
