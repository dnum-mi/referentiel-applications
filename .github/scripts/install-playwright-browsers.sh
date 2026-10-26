#!/usr/bin/env bash
set -euo pipefail

# Le miroir Azure peut télécharger les dépendances WebKit assez lentement pour
# épuiser le budget du job avant ses tests. Garder les dépôts Ubuntu officiels.
if [[ "${RUNNER_OS:-}" == "Linux" ]]; then
  while IFS= read -r -d '' source; do
    sudo sed -i -E \
      's#https?://azure\.archive\.ubuntu\.com/#https://archive.ubuntu.com/#g' \
      "$source"
  done < <(
    find /etc/apt -type f \
      \( -name '*.list' -o -name '*.sources' -o -name 'apt-mirrors*.txt' \) -print0
  )
fi

# Exécuter le Playwright du package appelant, tel que verrouillé par son lockfile.
pnpm exec playwright install --with-deps "$@"
