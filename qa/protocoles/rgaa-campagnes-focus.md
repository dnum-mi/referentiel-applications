# Campagnes et export des technologies : erreurs et focus

Périmètre : [#3322](https://github.com/dnum-mi/referentiel-applications/issues/3322)
et [#3324](https://github.com/dnum-mi/referentiel-applications/issues/3324),
dans le lot [#3307](https://github.com/dnum-mi/referentiel-applications/issues/3307).
Base de la correction : `f1534bcba4c902b4a0f2ac080422823b28801194`.

## Rejouer les contrôles

Utiliser la version Node de `.nvmrc`, installer les dépendances racine et frontend
avec les lockfiles, puis générer le client depuis le contrat OpenAPI du dépôt :

```sh
pnpm install --frozen-lockfile
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend api:generate
pnpm --dir frontend exec playwright install chromium firefox webkit
pnpm --dir frontend exec playwright test --config tests/browser/campaign-errors-focus.config.ts
```

La configuration démarre un serveur Vite local sur le port 5176. Les vrais
composants Vue, champs et dialogues DSFR, tables et stores sont montés dans des
fixtures. Les appels `/api/v2/` sont interceptés avec des utilisateurs, campagnes
et applications fictifs. Aucun e-mail, envoi de campagne ni changement de données
externes n'est nécessaire. Les réponses retardées sont libérées explicitement
par les tests.

## Comportements attendus

| Parcours                                    | Attendu                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actualiser les cibles                       | La commande reste focalisable pendant les deux chargements, campagne et cibles. Une nouvelle activation pendant l'attente ne lance pas de requête concurrente.                       |
| Réessayer après une erreur                  | Le bouton et son message restent présents pendant la requête. Après succès, si le focus était encore sur Réessayer, il rejoint Actualiser. Après échec, Réessayer garde le focus.    |
| Déplacer le focus pendant une requête       | La réponse ne ramène pas le focus d'un autre contrôle. Si l'utilisateur revient sur Réessayer avant son retrait, Actualiser devient la cible de reprise.                             |
| Pagination                                  | La page suivante reste utilisable au clavier et conserve le focus pendant le chargement.                                                                                             |
| Exporter les technologies                   | Le bouton reste focalisable et expose son indisponibilité et son état occupé. Les doubles activations sont ignorées ; succès et erreur ne provoquent pas de reprise forcée du focus. |
| Nom ou date de début manquants              | L'erreur nomme le champ, est associée au véritable input, expose son état invalide et disparaît après correction. La signification des astérisques est visible.                      |
| Sponsors invalides                          | La validation existante reste active, y compris après réouverture du dialogue. Le premier champ invalide est choisi dans l'ordre du formulaire : nom, sponsors, date.                |
| Millésime invalide                          | Une année vide, décimale ou hors de la plage existante 2000–2100 est refusée. Le champ reçoit le focus et conserve son aide. Une correction permet un nouvel essai.                  |
| Fermer un dialogue pendant l'enregistrement | Le retour de la réponse ne reprend pas le focus dans le dialogue fermé.                                                                                                              |

Les tests unitaires co-localisés complètent ces parcours en vérifiant les valeurs
conservées, les données envoyées après correction et l'absence de requête avant
correction. Les assertions de focus navigateur portent sur `document.activeElement`
via Playwright, avec les commandes réelles.

## Portée de la validation

Exécution locale du 23 novembre 2026, sur macOS avec Node 24.21.0 et
Playwright 1.63.0 : **54 tests réussis, sans nouvelle tentative**, soit
18 scénarios par moteur. Versions relevées après lancement réel :
Chromium 153.0.8010.12, Firefox 155.0 et WebKit 26.6.

Le job d'accessibilité frontend de Main CI rejoue ces scénarios : Chromium dans
la suite habituelle, puis Firefox et WebKit avec la configuration dédiée.

Les contrôles automatisés vérifient le focus dans Chromium, Firefox et WebKit,
ainsi que les noms, descriptions et états accessibles exposés par les composants.
Les exécutions doivent consigner leur commit, les versions et les résultats dans
le compte rendu de la PR.

Une restitution vocale réelle reste à consigner avec le lecteur d'écran et le
navigateur retenus dans la base de test RGAA : faire lire le nom, l'état invalide,
l'aide et l'erreur après refus, puis après correction. Une description accessible
correcte et des tests navigateur réussis ne prouvent pas seuls cette restitution.
Ce lot ne qualifie pas les treize autres critères ouverts de #3307 et ne constitue
pas un nouvel audit RGAA complet.
