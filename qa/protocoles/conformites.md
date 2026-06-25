# Protocole de non-régression — Conformités : éco-conception & homologation (`CMP-`)

> Onglet `tab-compliances` d'une fiche (`/applications/:id/tab-compliances`). Couvre les nouveautés
> de l'issue #1825 : valeurs d'homologation, calcul/permission/réinitialisation de l'éco-index et
> affichage du grade A→G. Utilisateur par défaut : `admin` / `pass`.

| Légende           |                                                         |
| :---------------- | :------------------------------------------------------ |
| **Automatisé** ✅ | `e2e/tests/conformites.spec.ts`                         |
| **Statut**        | ✅ 100 % des cas automatisés (POM strict + datafeature) |

---

### CMP-01 — Homologation : « Non réalisée » et « À mettre en place » ✅

- **Datafeature** : 1ʳᵉ application existante.
- **Action** : onglet `tab-compliances` → éditer l'homologation → sélectionner successivement « Non
  réalisée » puis « À mettre en place » dans `compliance-homologation-status` et enregistrer.
- **Résultat attendu** : le résumé de la ligne Homologation reflète chaque statut sélectionné ; un
  toast « Conformité mise à jour avec succès » confirme l'enregistrement.

### CMP-02 — Éco-index : seuls les droits d'écriture peuvent calculer ✅

- **Datafeature** : 1ʳᵉ application + utilisateur `user` (Lecteur).
- **Action** : ouvrir l'onglet conformités en `admin` puis en `user`, observer le bouton
  `compliance-scan-ecoindex-btn` de la ligne Écoconception.
- **Résultat attendu** : le bouton « Calculer » est actif pour un droit d'écriture (admin), désactivé
  pour un Lecteur.

### CMP-03 — Éco-index : modifier l'URL cible réinitialise le score ✅

- **Datafeature** : 1ʳᵉ application avec un score éco-index pré-positionné (via la datafeature).
- **Action** : éditer l'éco-conception, changer `ecoindex-target-url-input` puis enregistrer.
- **Résultat attendu** : le résumé passe à « Non calculé » ; `eco_index_score` est remis à `null`
  côté serveur.

### CMP-04 — Éco-index : affichage du score et du grade A→G ✅

- **Datafeature** : 1ʳᵉ application avec un score éco-index connu (via la datafeature).
- **Action** : ouvrir l'onglet conformités après avoir posé un score de 95 puis de 12.
- **Résultat attendu** : le résumé de la ligne Écoconception affiche le grade correspondant (95 → A,
  12 → F) selon les seuils 80/70/55/40/25/10.

### CMP-05 — DIMA : valeurs de durée autorisées ✅

- **Datafeature** : 1ʳᵉ application existante (admin).
- **Action** : onglet `tab-compliances` → éditer l'axe DIMA, dérouler `compliance-dima-duration`.
- **Résultat attendu** : la liste propose exactement **96H, 72H, 48H, 24H, 4H, 1H, 0H** (cf. ticket
  #1901), dans cet ordre.

### CMP-06 — PDMA : valeurs de durée autorisées ✅

- **Datafeature** : 1ʳᵉ application existante (admin).
- **Action** : onglet `tab-compliances` → éditer l'axe PDMA, dérouler `compliance-pdma-duration`.
- **Résultat attendu** : la liste propose exactement **48H, 24H, 2H, 0H** (cf. ticket #1901), dans cet
  ordre.
