import { routeNames } from "./route-names";

export interface NavItem {
  to: { name: string };
  text: string;
}

/**
 * Entrées du menu principal d'un utilisateur authentifié.
 *
 * Extrait de `App.vue` (où `baseNavItems` vivait dans le `<script setup>`, donc
 * non importable) pour que les libellés soient couverts par un test unitaire :
 * #2413 avait renommé « Fins de vie » en « Technologies », et la résolution de
 * conflit d'une branche antérieure (#2496) l'a réécrit en « Fin de vie » sans
 * qu'aucun filet ne s'en aperçoive — le reste du produit (h1, titre de route,
 * plan du site, onglet de fiche) disant toujours « Technologies ».
 */
export function buildNavItems(canManageAdminPanel: boolean): NavItem[] {
  return [
    { to: { name: routeNames.ACCUEIL }, text: "Accueil" },
    { to: { name: routeNames.SEARCHAPP }, text: "Applications" },
    { to: { name: routeNames.TIMEPAGE }, text: "Time" },
    { to: { name: routeNames.QUALITYPAGE }, text: "Qualité Générale" },
    // #2413 : l'entrée s'intitule « Technologies » (demande PO) ; la route reste `/fins-de-vie`.
    { to: { name: routeNames.ENDOFLIFE }, text: "Technologies" },
    { to: { name: routeNames.REPORTS }, text: "Signalements" },
    // #2440 : l'historique global expose les valeurs de champs (emails d'acteurs, dates de
    // conformité…) de toutes les applications, réservé aux administrateurs (cf. router meta
    // `requiresGlobalAdmin`).
    ...(canManageAdminPanel ? [{ to: { name: routeNames.HISTORY }, text: "Modifications" }] : []),
  ];
}

/** Menu réduit d'un visiteur non authentifié. */
export function buildPublicNavItems(): NavItem[] {
  return [{ to: { name: routeNames.ACCUEIL }, text: "Accueil" }];
}
