<script setup lang="ts">
import AdminUsersTab from "@/components/admin/AdminUsersTab.vue";
import AdminTagsTab from "@/components/admin/AdminTagsTab.vue";
import AdminBatchData from "@/components/admin/AdminBatchData.vue";
import AdminOrganizationsTab from "@/components/admin/AdminOrganizationsTab.vue";
import AdminActorsTab from "@/components/admin/AdminActorsTab.vue";
import { markRaw, ref, type Component } from "vue";
import AdminPermsMatrixTab from "@/components/admin/AdminPermsMatrixTab.vue";
import AdminLabelSourcesTab from "@/components/admin/AdminLabelSourcesTab.vue";
import AdminMditCampaignsTab from "@/components/admin/AdminMditCampaignsTab.vue";
import AdminTokensTab from "@/components/admin/AdminTokensTab.vue";
import AdminBusinessDivisionsTab from "@/components/admin/AdminBusinessDivisionsTab.vue";
import AdminCorrelationsTab from "@/components/admin/AdminCorrelationsTab.vue";
import AdminEmailLogsTab from "@/components/admin/AdminEmailLogsTab.vue";
import AdminQualityCampaignsTab from "@/components/admin/AdminQualityCampaignsTab.vue";
import AdminActionLogsTab from "@/components/admin/AdminActionLogsTab.vue";
import { computed } from "vue";
import { Permission } from "@/client";
import { useUserStore } from "@/stores/userStore";

type AdminThemeId = "users-rights" | "campaigns" | "management";

interface AdminTheme {
  id: AdminThemeId;
  title: string;
  description: string;
}

interface DsfrTab {
  title: string;
  icon?: string;
  tabId: string;
  panelId: string;
  component: Component;
  themeId: AdminThemeId;
  /**
   * Permissions autorisant l'accès à l'onglet (OR) — par défaut `GlobalAdminManage` seul.
   *
   * #2446 : le défaut est l'administration GLOBALE. Un administrateur ayant un périmètre
   * organisationnel ne conserve que les onglets explicitement ouverts à `AdminPanelManage`
   * (utilisateurs, acteurs), les seuls dont le contenu se découpe par périmètre.
   */
  permissions?: Permission[];
}

const userStore = useUserStore();
const activeTab = ref(0);

// Regroupement thématique (#2419) : la liste à plat de 14 onglets nuisait à la lisibilité.
const themes: AdminTheme[] = [
  {
    id: "users-rights",
    title: "Utilisateurs & droits",
    description: "Utilisateurs, organisations, directions métier, acteurs et matrice des permissions.",
  },
  {
    id: "campaigns",
    title: "Campagnes",
    description: "Dette IT, mise en qualité et revue datasteward.",
  },
  {
    id: "management",
    title: "Gestion",
    description: "Sources, tags, tokens, batchs de données et journal des actions.",
  },
];

const allTabs: DsfrTab[] = [
  {
    title: "Gestion des utilisateurs",
    icon: "ri-user-settings-line",
    tabId: "tab-users",
    panelId: "panel-users",
    component: markRaw(AdminUsersTab),
    themeId: "users-rights",
    // #2446 : liste filtrée par le périmètre de l'administrateur côté API.
    permissions: [Permission.ADMIN_PANEL_MANAGE],
  },
  {
    title: "Gestion des organisations",
    icon: "ri-building-line",
    tabId: "tab-organizations",
    panelId: "panel-organizations",
    component: markRaw(AdminOrganizationsTab),
    themeId: "users-rights",
  },
  {
    title: "Gestion des acteurs",
    icon: "ri-team-line",
    tabId: "tab-actors",
    panelId: "panel-actors",
    component: markRaw(AdminActorsTab),
    themeId: "users-rights",
    // #2446 : liste filtrée par le périmètre de l'administrateur côté API.
    permissions: [Permission.ADMIN_PANEL_MANAGE],
  },
  {
    title: "Directions métier",
    icon: "ri-organization-chart",
    tabId: "tab-business-divisions",
    panelId: "panel-business-divisions",
    component: markRaw(AdminBusinessDivisionsTab),
    themeId: "users-rights",
  },
  {
    title: "Matrice des permissions",
    icon: "ri-shield-user-line",
    tabId: "tab-app-perms-matrix",
    panelId: "panel-app-perms-matrix",
    component: markRaw(AdminPermsMatrixTab),
    themeId: "users-rights",
  },
  {
    title: "Campagnes dette IT",
    icon: "ri-calendar-event-line",
    tabId: "tab-mdit-campaigns",
    panelId: "panel-mdit-campaigns",
    component: markRaw(AdminMditCampaignsTab),
    themeId: "campaigns",
  },
  {
    title: "Campagnes de mise en qualité",
    icon: "ri-mail-send-line",
    tabId: "tab-quality-campaigns",
    panelId: "panel-quality-campaigns",
    component: markRaw(AdminQualityCampaignsTab),
    themeId: "campaigns",
    // Délégable à un non-admin (#2282). #2446 : la capacité dédiée est désormais la SEULE porte
    // d'entrée — un administrateur de périmètre ne l'a que si elle lui a été déléguée.
    permissions: [Permission.QUALITY_CAMPAIGN_MANAGE],
  },
  {
    title: "Revue datasteward",
    icon: "ri-git-merge-line",
    tabId: "tab-correlations",
    panelId: "panel-correlations",
    component: markRaw(AdminCorrelationsTab),
    themeId: "campaigns",
    // Pas de `permissions` : le défaut du filtre ci-dessous est GlobalAdminManage,
    // qui est exactement ce qu'exigent les endpoints de revue des corrélations.
  },
  {
    title: "Gestions des tags",
    icon: "ri-price-tag-line",
    tabId: "tab-tags",
    panelId: "panel-tags",
    component: markRaw(AdminTagsTab),
    themeId: "management",
  },
  {
    title: "Gestions des sources",
    icon: "ri-database-2-line",
    tabId: "tab-label-sources",
    panelId: "panel-label-sources",
    component: markRaw(AdminLabelSourcesTab),
    themeId: "management",
  },
  {
    title: "Gestion des tokens",
    icon: "ri-key-2-line",
    tabId: "tab-tokens",
    panelId: "panel-tokens",
    component: markRaw(AdminTokensTab),
    themeId: "management",
  },
  {
    title: "Batch de données",
    icon: "ri-stack-line",
    tabId: "batch-data",
    panelId: "panel-batch-data",
    component: markRaw(AdminBatchData),
    themeId: "management",
  },
  {
    title: "Historique des e-mails",
    icon: "ri-mail-line",
    tabId: "tab-email-logs",
    panelId: "panel-email-logs",
    component: markRaw(AdminEmailLogsTab),
    themeId: "management",
  },
  {
    title: "Journal des actions",
    icon: "ri-history-line",
    tabId: "tab-action-logs",
    panelId: "panel-action-logs",
    component: markRaw(AdminActionLogsTab),
    themeId: "management",
    // Pas de `permissions` : couvre TOUTES les routes mutantes (acteurs, utilisateurs,
    // permissions…), plus sensible que les autres onglets — réservé à GlobalAdminManage.
  },
];

// Un utilisateur délégué uniquement QualityCampaignManage atteint /administration (cf. router)
// mais ne doit voir que l'onglet couvert par cette permission, pas le reste du panneau admin.
// Même mécanique pour l'administrateur de périmètre (#2446) : il n'a pas `GlobalAdminManage`,
// donc le défaut ci-dessous ne lui laisse que les onglets Utilisateurs et Acteurs.
const tabs = computed(() => allTabs.filter((tab) => userStore.hasPermissions(tab.permissions ?? [Permission.GLOBAL_ADMIN_MANAGE])));

// Un thème n'est proposé que s'il contient au moins un onglet visible pour l'utilisateur
// courant (ex. le délégué QualityCampaignManage ne doit voir que la tuile « Campagnes »).
const visibleThemes = computed(() => themes.filter((theme) => tabs.value.some((tab) => tab.themeId === theme.id)));

// #2446 : la description rédigée annonce le thème complet. Dès qu'un onglet est masqué (délégué
// QualityCampaignManage, administrateur de périmètre), elle promettrait des écrans inaccessibles :
// on énumère alors les seuls onglets réellement ouverts.
function themeDescription(theme: AdminTheme): string {
  const visible = tabs.value.filter((tab) => tab.themeId === theme.id);
  const total = allTabs.filter((tab) => tab.themeId === theme.id).length;
  if (visible.length === total) return theme.description;
  return `${visible.map((tab) => tab.title).join(", ")}.`;
}

const selectedThemeId = ref<AdminThemeId>(themes[0].id);

// Retombe sur le premier thème visible si le thème sélectionné n'a plus d'onglet visible
// (changement de permissions, ou thème par défaut indisponible pour un utilisateur délégué).
const currentThemeId = computed(() => {
  if (visibleThemes.value.some((theme) => theme.id === selectedThemeId.value)) return selectedThemeId.value;
  return visibleThemes.value[0]?.id;
});

const themeTabs = computed(() => tabs.value.filter((tab) => tab.themeId === currentThemeId.value));

function selectTheme(id: AdminThemeId): void {
  selectedThemeId.value = id;
  activeTab.value = 0;
}

const tabsStyle = ref({ "--tabs-height": "auto" });
</script>

<template>
  <div class="fr-container admin-page-container">
    <div class="fr-grid-row fr-grid-row--gutters fr-mb-3w" data-testid="admin-theme-tiles">
      <div v-for="theme in visibleThemes" :key="theme.id" class="fr-col-12 fr-col-sm-4">
        <button
          type="button"
          class="fr-tile fr-tile--sm fr-enlarge-link admin-theme-tile"
          :class="{ 'admin-theme-tile--active': theme.id === currentThemeId }"
          :aria-pressed="theme.id === currentThemeId"
          :data-testid="`admin-theme-tile-${theme.id}`"
          @click="selectTheme(theme.id)"
        >
          <div class="fr-tile__body">
            <div class="fr-tile__content">
              <h3 class="fr-tile__title">{{ theme.title }}</h3>
              <p class="fr-tile__desc fr-text--sm">{{ themeDescription(theme) }}</p>
            </div>
          </div>
        </button>
      </div>
    </div>

    <DsfrTabs
      :key="currentThemeId"
      v-model="activeTab"
      tab-list-name="Administration"
      :tab-titles="themeTabs"
      data-testid="admin-tabs"
      :style="tabsStyle"
    >
      <template v-for="(tab, index) in themeTabs" :key="tab.panelId">
        <KeepAlive>
          <DsfrTabContent
            v-if="activeTab === index"
            :panel-id="tab.panelId"
            :tab-id="tab.tabId"
            :aria-label="`Onglet ${tab.title}`"
            :data-testid="tab.panelId"
          >
            <component :is="tab.component" />
          </DsfrTabContent>
        </KeepAlive>
      </template>
    </DsfrTabs>
  </div>
</template>

<style scoped>
/* fr-container passe à 1.5rem de marge dès sm — trop large ici : on la réduit uniformément.
On retire aussi le max-width (78rem dès xl) pour occuper toute la largeur disponible. */
.admin-page-container {
  max-width: none;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.admin-theme-tile {
  width: 100%;
  border: none;
  appearance: none;
  text-align: inherit;
  font: inherit;
  cursor: pointer;
}

.admin-theme-tile--active {
  box-shadow:
    inset 0 0 0 1px var(--border-plain-blue-france),
    inset 0 -0.25rem 0 0 var(--background-action-high-blue-france);
}
</style>
