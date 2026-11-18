# Audit des dépendances

Le workflow `Dependency Security Audit` installe les cinq projets avec leur
lockfile et sans scripts de cycle de vie, puis interroge le registre avec
`pnpm audit --json --audit-level=low`. Les dépendances de développement et
optionnelles restent incluses.

Le registre npm peut continuer à retourner un avis retiré de la base GitHub.
C'est le cas de [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf),
retiré le 18 novembre 2026 à 15 h 38 min 56 s UTC, mais encore signalé par npm
après cette date. Ce retrait ne constitue pas une nouvelle version corrigée de
picomatch.

Le script `.github/scripts/audit-dependencies.mjs` conserve le rapport npm brut
et vérifie les avis signalés auprès de l'API officielle GitHub. Seul un retrait
confirmé pour le même identifiant GHSA et le même paquet npm peut être accepté.
Les retraits sont affichés explicitement avec leur date et leur source. Il n'y
a ni liste d'exceptions permanente, ni modification du seuil de sévérité.

Un avis actif, un rapport incohérent, une erreur du registre ou l'impossibilité
de confirmer un retrait fait échouer le job. Lorsque npm cesse de retourner
l'avis retiré, aucune requête de vérification de cet avis n'est nécessaire.

Après installation des dépendances, depuis chacun des répertoires `.`,
`backend`, `frontend`, `e2e` et `qa/at-windows` :

```sh
node /chemin/du/depot/.github/scripts/audit-dependencies.mjs
```

`GITHUB_TOKEN` est facultatif en local et fourni par GitHub Actions pour les
limites de requêtes de l'API. Les tests du script utilisent des fixtures, sans
accès réseau :

```sh
node --test .github/scripts/audit-dependencies.test.mjs
```
