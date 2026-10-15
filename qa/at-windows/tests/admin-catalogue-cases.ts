import type { AdminScene } from "./admin-interactive-utils.js";

export type CatalogueCase = {
  scene: AdminScene;
  editId: string;
  editName: string;
  editTitle: string;
  saveId: string;
  saveName: string;
  saveError: string;
  deleteId: string;
  deleteName: string;
  deleteTitle: string;
  confirmId: string;
  confirmName: string;
  deleteError: string;
  confirmation: string[];
  fields: {
    id: string;
    name: string;
    role: "textbox" | "spinbutton";
    input: string;
    key: string;
  }[];
};

// Les libellés viennent des composants ; les valeurs sont des entrées fictives indépendantes du DOM.
export const catalogueCases: CatalogueCase[] = [
  {
    scene: "organization",
    editId: "admin-organization-edit-btn",
    editName: "Modifier l'organisation",
    editTitle: "Modifier une organisation",
    saveId: "admin-save-organization-btn",
    saveName: "Enregistrer l'organisation",
    saveError: "Erreur lors de la sauvegarde de l'organisation",
    deleteId: "admin-organization-delete-btn",
    deleteName: "Supprimer l'organisation",
    deleteTitle: "Supprimer l'organisation",
    confirmId: "admin-delete-confirm-btn",
    confirmName: "Supprimer l’organisation",
    deleteError: "Erreur lors de la suppression de l'organisation",
    confirmation: ["Cette action est irréversible", "ORG/FAKE"],
    fields: [
      {
        id: "organization-path",
        name: "Chemin",
        role: "textbox",
        input: "ORG/QA",
        key: "path",
      },
      {
        id: "organization-sigle",
        name: "Sigle",
        role: "textbox",
        input: "QA",
        key: "sigle",
      },
      {
        id: "organization-url",
        name: "URL",
        role: "textbox",
        input: "https://example.invalid/qa",
        key: "url",
      },
    ],
  },
  {
    scene: "business",
    editId: "admin-business-division-edit-btn",
    editName: "Modifier la direction métier",
    editTitle: "Modifier la direction métier Direction fictive",
    saveId: "admin-business-division-save-btn",
    saveName: "Enregistrer",
    saveError: "Erreur lors de la sauvegarde de la direction métier.",
    deleteId: "admin-business-division-delete-btn",
    deleteName: "Supprimer la direction métier",
    deleteTitle: "Supprimer la direction métier",
    confirmId: "admin-business-division-delete-confirm-btn",
    confirmName: "Supprimer la direction métier",
    deleteError: "Erreur lors de la suppression de la direction métier",
    confirmation: [
      "Direction fictive",
      "Les organisations et applications liées ne seront pas supprimées, seulement détachées",
    ],
    fields: [
      {
        id: "business-division-label",
        name: "Nom de la direction métier",
        role: "textbox",
        input: "Direction QA",
        key: "label",
      },
    ],
  },
  {
    scene: "tags",
    editId: "admin-tag-edit-btn",
    editName: "Modifier le tag",
    editTitle: "Modifier le tag",
    saveId: "admin-save-perms-btn",
    saveName: "Enregistrer les modifications",
    saveError: "Erreur lors de la sauvegarde du tag",
    deleteId: "admin-tag-delete-btn",
    deleteName: "Supprimer le tag",
    deleteTitle: "Supprimer le tag",
    confirmId: "admin-delete-confirm-btn",
    confirmName: "Supprimer le tag",
    deleteError: "Erreur lors de la suppression du tag",
    confirmation: ["Cette action est irréversible", "tag-qa"],
    fields: [
      {
        id: "tag-name",
        name: "Nom du tag",
        role: "textbox",
        input: "tag-qa-new",
        key: "name",
      },
    ],
  },
  {
    scene: "sources",
    editId: "admin-label-source-edit-btn",
    editName: "Modifier la source",
    editTitle: "Modifier la source",
    saveId: "admin-save-perms-btn",
    saveName: "Enregistrer les modifications",
    saveError: "Erreur lors de la sauvegarde de la source",
    deleteId: "admin-label-source-delete-btn",
    deleteName: "Supprimer la source",
    deleteTitle: "Supprimer la source",
    confirmId: "admin-delete-confirm-btn",
    confirmName: "Supprimer la source",
    deleteError: "Erreur lors de la suppression de la source",
    confirmation: [
      "Cela concerne la source ainsi que tous ses noms alternatifs",
      "SOURCE_QA",
    ],
    fields: [
      {
        id: "label-source-source",
        name: "Valeur de la source",
        role: "textbox",
        input: "SOURCE_QA_NEW",
        key: "source",
      },
    ],
  },
  {
    scene: "hosting",
    editId: "admin-hosting-option-edit-btn",
    editName: "Modifier",
    editTitle: "Modifier la plateforme d'hébergement",
    saveId: "admin-save-hosting-option-btn",
    saveName: "Enregistrer",
    saveError: "Erreur lors de la sauvegarde de la plateforme d'hébergement.",
    deleteId: "admin-hosting-option-delete-btn",
    deleteName: "Supprimer",
    deleteTitle: "Supprimer la plateforme d'hébergement",
    confirmId: "admin-delete-confirm-btn",
    confirmName: "Supprimer",
    deleteError: "Erreur lors de la suppression de la plateforme d'hébergement",
    confirmation: [
      "Fournisseur fictif",
      "Plateforme fictive",
      "Site fictif",
      "2 hébergements",
      "ils ne seront plus rattachés à aucune plateforme",
    ],
    fields: [
      {
        id: "hosting-option-provider",
        name: "Fournisseur",
        role: "textbox",
        input: "Fournisseur QA",
        key: "provider",
      },
      {
        id: "hosting-option-platform",
        name: "Plateforme",
        role: "textbox",
        input: "Plateforme QA",
        key: "platform",
      },
      {
        id: "hosting-option-site",
        name: "Site",
        role: "textbox",
        input: "Site QA",
        key: "site",
      },
      {
        id: "hosting-option-building",
        name: "Bâtiment",
        role: "textbox",
        input: "BATQA",
        key: "building",
      },
      {
        id: "hosting-option-room",
        name: "Pièce",
        role: "textbox",
        input: "ROOMQA",
        key: "room",
      },
    ],
  },
  {
    scene: "mdit",
    editId: "admin-campaign-edit-btn",
    editName: "Modifier la campagne",
    editTitle: "Modifier la campagne 2026",
    saveId: "admin-campaign-save-btn",
    saveName: "Enregistrer",
    saveError: "Erreur lors de la sauvegarde de la campagne.",
    deleteId: "admin-campaign-delete-btn",
    deleteName: "Supprimer la campagne",
    deleteTitle: "Supprimer la campagne",
    confirmId: "admin-campaign-delete-confirm-btn",
    confirmName: "Supprimer la campagne",
    deleteError: "Erreur lors de la suppression de la campagne",
    confirmation: ["Cette action est irréversible", "2026"],
    fields: [
      {
        id: "campaign-year",
        name: "Millésime (année)",
        role: "spinbutton",
        input: "2027",
        key: "year",
      },
      {
        id: "campaign-label",
        name: "Libellé (optionnel)",
        role: "textbox",
        input: "Campagne QA",
        key: "label",
      },
    ],
  },
];
