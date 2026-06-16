# Protocole de non-régression — Catalogue & recherche (`CAT-`)

> Source de vérité des cas de test du catalogue. Le template d'issue
> `.github/ISSUE_TEMPLATE/qa-catalogue.md` reprend cette checklist pour une campagne de version.
> Route : `/recherche-application` (`routeNames.SEARCHAPP`). Utilisateur par défaut : `admin` / `pass`.

| Légende           |                                                                        |
| :---------------- | :--------------------------------------------------------------------- |
| **Automatisé** ✅ | rejoué par Playwright (`e2e/tests/catalogue.spec.ts`), coché par la CI |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + datafeature)                |

---

### CAT-01 — Redirection vers la connexion si non authentifié ✅

- **Datafeature** : aucune (session vierge).
- **Action** : ouvrir `/recherche-application` sans être connecté.
- **Résultat attendu** : redirection vers la page d'authentification Keycloak.

### CAT-02 — Affichage de la liste et de l'IQ moyen ✅

- **Datafeature** : ≥ 1 application existante.
- **Action** : se connecter, aller sur `/recherche-application`.
- **Résultat attendu** : `application-table` (ou `application-card-view`) affiche ≥ 1 ligne ;
  `sidebar-total-count` > 0 ; `application-average-iq` est visible.

### CAT-03 — Recherche par nom (URL + compteur) ✅

- **Datafeature** : libellé de la 1ʳᵉ application listée.
- **Action** : ouvrir l'accordéon Général, saisir le libellé dans `application-filter-label`.
- **Résultat attendu** : l'URL porte `?search=…` ; `sidebar-total-count` diminue et reste > 0.

### CAT-04 — Filtre par statut ✅

- **Action** : accordéon Statut → cocher `status-option-to_validate`.
- **Résultat attendu** : l'URL porte `currentStatus__in=to_validate` ; la liste se met à jour.

### CAT-05 — Filtre par organisation ✅

- **Action** : accordéon Organisation → saisir un nom dans `organization-filter-input`.
- **Résultat attendu** : l'URL porte `organization=…` ; la liste se restreint.

### CAT-06 — Combinaison de filtres ✅

- **Action** : combiner statut + organisation + hébergement.
- **Résultat attendu** : tous les paramètres coexistent dans l'URL ; le compteur reflète l'intersection.

### CAT-07 — Réinitialisation des filtres ✅

- **Datafeature** : compteur initial mémorisé.
- **Action** : poser un filtre, cliquer `sidebar-reset-filters-button`.
- **Résultat attendu** : l'URL est nettoyée ; les champs sont vidés ; le compteur revient à l'initial.

### CAT-08 — Tri par colonne (Nom / IQ) ✅

- **Action** : cliquer l'en-tête `Nom` (asc/desc), puis l'en-tête `IQ`.
- **Résultat attendu** : l'URL porte `order` puis `sortBy=quality` ; l'ordre des lignes change.

### CAT-09 — Pagination ✅

- **Datafeature** : total > taille de page.
- **Action** : régler la taille de page à 5, page suivante puis précédente.
- **Résultat attendu** : l'URL porte `pageSize=5` puis `page=1` puis `page=0`.

### CAT-10 — Bascule « Mes applications » ✅

- **Action** : activer `my-apps-filter-toggle`.
- **Résultat attendu** : la liste se restreint aux applications de l'utilisateur ; l'URL est mise à jour.

### CAT-11 — Bascule vue tableau / cartes ✅

- **Action** : basculer l'affichage.
- **Résultat attendu** : `application-table-view` ↔ `application-card-view` ; mêmes données.

### CAT-12 — Persistance des filtres après rechargement ✅

- **Action** : poser des filtres, recharger la page, revenir via le navigateur.
- **Résultat attendu** : les filtres et l'URL sont restaurés à l'identique.

### CAT-13 — Navigation vers la fiche application ✅

- **Datafeature** : 1ʳᵉ application listée.
- **Action** : cliquer le lien de la première ligne.
- **Résultat attendu** : navigation vers `/applications/:id` ; la fiche se charge.

### CAT-14 — État vide ✅

- **Action** : rechercher un terme sans résultat.
- **Résultat attendu** : message « Aucune donnée ne correspond à votre recherche. » ;
  `sidebar-total-count` = 0.

### CAT-15 — Export Excel (admin) ✅

- **Datafeature** : utilisateur `admin`.
- **Action** : cliquer `application-export-btn`.
- **Résultat attendu** : un fichier `.xlsx` est téléchargé, cohérent avec les filtres actifs.

### CAT-16 — Bascule « Mes abonnements » ✅

- **Action** : activer `my-apps-filter-toggle-subscribed`.
- **Résultat attendu** : l'URL porte `subscribersEmail=true` ; la liste se restreint aux applications
  auxquelles l'utilisateur est abonné.

### CAT-17 — Colonnes avancées (MOA / MOE / Plateforme / Fournisseur) ✅

- **Datafeature** : utilisateur disposant du droit `ColumnRead` (Lecteur ou plus).
- **Action** : ouvrir `customize-columns-button`, cocher les colonnes MOA, MOE, Plateforme et
  Fournisseur, fermer la boîte.
- **Résultat attendu** : les quatre colonnes sont proposées dans la personnalisation et leurs en-têtes
  apparaissent dans le tableau.
