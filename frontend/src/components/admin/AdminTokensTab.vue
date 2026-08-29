<script setup lang="ts">
import type { CreateServiceTokenDto, ExposedTokenDto, TokenDto } from "@/client/types.gen";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DataTablePageEvent } from "primevue/datatable";
import api from "@/api";
import RefAppTable from "@/components/RefAppTable.vue";
import OrganizationSearchSelect from "@/components/common/OrganizationSearchSelect.vue";
import type { TableColumn } from "@/types/table";
import { RolesOptions, RolesScopes, RolesWording } from "@/utils/roles-utils";
import { TokenKindWording } from "@/utils/token-utils";

// #2384 : ces tables sont en mode lazy sans handler `@sort`, et la route `GET /tokens` ne trie pas
// côté serveur (le service ignore sortBy/order, orderBy figé à createdAt desc). Un en-tête triable
// armait alors des squelettes de chargement jamais résolus, figeant l'onglet. Tant que le tri
// serveur n'est pas implémenté pour cette route, on désactive le tri sur toutes les colonnes.
const serviceTokenHeaders = [
  { key: "kind", label: "Type", isSortable: false },
  { key: "name", label: "Nom", isSortable: false },
  { key: "description", label: "Description", isSortable: false },
  { key: "role", label: "Rôle", isSortable: false },
  { key: "scopeOrganization", label: "Périmètre", isSortable: false },
  { key: "createdBy", label: "Créé par", isSortable: false },
  { key: "expiresAt", label: "Date d'expiration", isSortable: false },
  { key: "status", label: "Statut", isSortable: false },
  { key: "actions", label: "Actions", isSortable: false },
] as const;

const personalTokenHeaders = [
  { key: "kind", label: "Type", isSortable: false },
  { key: "user", label: "Utilisateur", isSortable: false },
  { key: "name", label: "Nom", isSortable: false },
  { key: "description", label: "Description", isSortable: false },
  { key: "expiresAt", label: "Date d'expiration", isSortable: false },
  { key: "status", label: "Statut", isSortable: false },
  { key: "actions", label: "Actions", isSortable: false },
] as const;

const serviceTokenColumns: TableColumn[] = serviceTokenHeaders.map((h) => ({
  field: h.key,
  header: h.label,
  sortable: h.isSortable,
}));

const personalTokenColumns: TableColumn[] = personalTokenHeaders.map((h) => ({
  field: h.key,
  header: h.label,
  sortable: h.isSortable,
}));

const isLoading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const showCreateForm = ref(false);
const newlyCreatedToken = ref<ExposedTokenDto | null>(null);
const showRevokeConfirmation = ref(false);
const tokenToRevoke = ref<string | null>(null);

type ServiceTokenForm = Omit<CreateServiceTokenDto, "scopeOrganizationId"> & {
  scopeOrganizationId?: string;
};

const newToken = ref<ServiceTokenForm>({
  name: "",
  description: "",
  expiresAt: "",
  role: "VISITOR",
  scopeOrganizationId: "",
});

const serviceTokens = ref<TokenDto[]>([]);
const serviceTokensTotal = ref(0);
const isServiceLoading = ref(false);
const currentServiceTokenPage = ref(0);
const serviceTokenPageSize = ref(10);
const serviceTokenFirstIndex = computed(() => currentServiceTokenPage.value * serviceTokenPageSize.value);

const personalTokens = ref<TokenDto[]>([]);
const personalTokensTotal = ref(0);
const isPersonalLoading = ref(false);
const currentPersonalTokenPage = ref(0);
const personalTokenPageSize = ref(10);
const personalTokenFirstIndex = computed(() => currentPersonalTokenPage.value * personalTokenPageSize.value);

async function fetchServiceTokens() {
  isServiceLoading.value = true;

  const response = await api.tokenControllerList({
    query: { kind: "service", page: currentServiceTokenPage.value, pageSize: serviceTokenPageSize.value },
  });
  if (response.error) {
    error.value = "Erreur lors du chargement des tokens";
    isServiceLoading.value = false;
    return;
  }

  serviceTokens.value = response.data?.results ?? [];
  serviceTokensTotal.value = response.data?.total ?? 0;
  isServiceLoading.value = false;
}

async function fetchPersonalTokens() {
  isPersonalLoading.value = true;

  const response = await api.tokenControllerList({
    query: { kind: "personal", page: currentPersonalTokenPage.value, pageSize: personalTokenPageSize.value },
  });
  if (response.error) {
    error.value = "Erreur lors du chargement des tokens";
    isPersonalLoading.value = false;
    return;
  }

  personalTokens.value = response.data?.results ?? [];
  personalTokensTotal.value = response.data?.total ?? 0;
  isPersonalLoading.value = false;
}

function onServiceTokenPage(event: DataTablePageEvent) {
  currentServiceTokenPage.value = event.page;
  serviceTokenPageSize.value = event.rows;
  fetchServiceTokens();
}

function onPersonalTokenPage(event: DataTablePageEvent) {
  currentPersonalTokenPage.value = event.page;
  personalTokenPageSize.value = event.rows;
  fetchPersonalTokens();
}

const serviceTokenRows = computed(() =>
  serviceTokens.value.map((token) => ({
    kind: TokenKindWording[token.kind],
    name: token.name,
    description: token.description,
    role: token.role ? RolesWording[token.role] : "-",
    scopeOrganization: token.scopeOrganization?.path ?? "-",
    createdBy: token.createdBy.email,
    expiresAt: token.expiresAt,
    status: token.status,
    actions: token,
  })),
);

const personalTokenRows = computed(() =>
  personalTokens.value.map((token) => ({
    kind: TokenKindWording[token.kind],
    user: token.userImpersonate?.email ?? token.createdBy.email,
    name: token.name,
    description: token.description,
    expiresAt: token.expiresAt,
    status: token.status,
    actions: token,
  })),
);

// Même règle métier que pour l'édition d'un utilisateur : pas de périmètre pour un rôle VISITOR.
const isScopeDisabled = computed(() => newToken.value.role === "VISITOR");
const labelScope = computed(() => RolesScopes[newToken.value.role] || "Organisation du périmètre");

function resetForm() {
  newToken.value = { name: "", description: "", expiresAt: "", role: "VISITOR", scopeOrganizationId: "" };
}

function resetMessages() {
  error.value = null;
  successMessage.value = null;
}

async function fetchTokens() {
  error.value = null;
  await Promise.all([fetchServiceTokens(), fetchPersonalTokens()]);
}

async function createServiceToken() {
  isLoading.value = true;
  newlyCreatedToken.value = null;
  resetMessages();

  const response = await api.tokenControllerCreateService({
    body: {
      ...newToken.value,
      scopeOrganizationId: isScopeDisabled.value || !newToken.value.scopeOrganizationId ? null : newToken.value.scopeOrganizationId,
    },
  });
  if (response.error || !response.data) {
    error.value = (response.error as { message?: string })?.message ?? "Erreur lors de la création du token";
    isLoading.value = false;
    return;
  }

  newlyCreatedToken.value = response.data;
  successMessage.value = "Token applicatif créé avec succès";
  resetForm();
  showCreateForm.value = false;
  await fetchTokens();
  isLoading.value = false;
}

function requestRevokeToken(tokenId: string) {
  tokenToRevoke.value = tokenId;
  showRevokeConfirmation.value = true;
}

async function confirmRevokeToken() {
  if (!tokenToRevoke.value) return;

  isLoading.value = true;
  resetMessages();

  const response = await api.tokenControllerDelete({ path: { id: tokenToRevoke.value } });
  if (response.error) {
    error.value = "Erreur lors de la révocation du token";
    isLoading.value = false;
    showRevokeConfirmation.value = false;
    tokenToRevoke.value = null;
    return;
  }

  successMessage.value = "Token révoqué avec succès";
  await fetchTokens();
  isLoading.value = false;
  showRevokeConfirmation.value = false;
  tokenToRevoke.value = null;
}

function cancelRevokeToken() {
  showRevokeConfirmation.value = false;
  tokenToRevoke.value = null;
}

function toggleCreateForm() {
  showCreateForm.value = !showCreateForm.value;
  if (!showCreateForm.value) resetForm();
}

function formatDate(dateString?: string): string {
  if (!dateString) {
    return "N/A";
  }
  try {
    return format(new Date(dateString), "dd MMMM yyyy", { locale: fr });
  } catch {
    return dateString;
  }
}

function isExpiredStatus(status: TokenDto["status"]): boolean {
  return status === "expired";
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    successMessage.value = "Token copié dans le presse-papier";
    setTimeout(() => {
      if (successMessage.value === "Token copié dans le presse-papier") {
        successMessage.value = null;
      }
    }, 3000);
  });
}

function dismissNewToken() {
  newlyCreatedToken.value = null;
}

onMounted(() => {
  fetchTokens();
});
</script>

<template>
  <div>
    <h1 class="fr-h1" data-testid="admin-tokens-title">Gestion des tokens</h1>

    <DsfrAlert v-if="error" type="error" :title="error" class="fr-mb-2w" closeable @close="error = null" />

    <DsfrAlert
      v-if="successMessage && !newlyCreatedToken"
      type="success"
      :title="successMessage"
      class="fr-mb-2w"
      closeable
      @close="successMessage = null"
    />

    <DsfrAlert v-if="newlyCreatedToken" type="success" title="Token créé avec succès" class="fr-mb-2w" closeable @close="dismissNewToken">
      <p class="fr-mb-1w"><strong>Attention :</strong> Copiez ce token maintenant, il ne sera plus affiché.</p>
      <div class="token-display fr-mb-1w">
        <code class="token-value">{{ newlyCreatedToken.password }}</code>
        <DsfrButton size="sm" secondary icon="ri-file-copy-line" @click="copyToClipboard(newlyCreatedToken.password)"> Copier </DsfrButton>
      </div>
    </DsfrAlert>

    <section class="fr-mb-6w">
      <div class="header-row fr-mb-2w">
        <h2 class="fr-h3 fr-mb-0">Tokens applicatifs</h2>
        <DsfrButton v-if="!showCreateForm" icon="ri-add-line" data-testid="admin-token-create-btn" @click="toggleCreateForm">
          Créer un token applicatif
        </DsfrButton>
      </div>
      <p class="fr-text--sm">Tokens permettant à des systèmes tiers d'accéder à l'API du référentiel.</p>

      <div v-if="showCreateForm" class="fr-card fr-p-3w fr-mb-3w">
        <h3 class="fr-h5 fr-mb-2w">Nouveau token applicatif</h3>
        <form @submit.prevent="createServiceToken">
          <DsfrInputGroup
            v-model.trim="newToken.name"
            label="Nom"
            label-visible
            required
            hint="Nom du service ou de l'application utilisant ce token"
          />

          <DsfrInputGroup
            v-model.trim="newToken.description"
            label="Description"
            label-visible
            required
            hint="Description de l'usage du token"
          />

          <DsfrSelect
            v-model="newToken.role"
            label="Rôle"
            label-visible
            required
            :options="RolesOptions.map((option) => ({ text: option.label, value: option.value }))"
          />

          <OrganizationSearchSelect
            v-show="!isScopeDisabled"
            v-model="newToken.scopeOrganizationId"
            class="fr-mb-2w"
            :label="labelScope"
            data-testid="admin-token-scope-organization-search"
          />

          <DsfrInputGroup
            v-model="newToken.expiresAt"
            label="Date d'expiration"
            label-visible
            required
            type="date"
            hint="Maximum 1 an dans le futur"
          />

          <div class="fr-mt-2w">
            <DsfrButton type="submit" :disabled="isLoading"> Créer le token </DsfrButton>
            <DsfrButton type="button" secondary class="fr-ml-2w" @click="toggleCreateForm"> Annuler </DsfrButton>
          </div>
        </form>
      </div>

      <div v-if="isServiceLoading && serviceTokens.length === 0" class="fr-py-6w fr-text--center">Chargement...</div>

      <div v-else-if="serviceTokens.length === 0" class="fr-card fr-p-3w">
        <p class="fr-text--center fr-mb-0">Aucun token applicatif créé pour le moment.</p>
      </div>

      <RefAppTable
        v-else
        :items="serviceTokenRows"
        :columns="serviceTokenColumns"
        :loading="isServiceLoading"
        :lazy="true"
        :paginator="true"
        :rows="serviceTokenPageSize"
        :first="serviceTokenFirstIndex"
        :total-records="serviceTokensTotal"
        data-testid="admin-service-tokens-table"
        @page="onServiceTokenPage"
      >
        <template #body-expiresAt="{ data }">
          {{ formatDate(data.expiresAt) }}
        </template>

        <template #body-status="{ data }">
          <span v-if="isExpiredStatus(data.status)" class="fr-badge fr-badge--error"> Expiré </span>
          <span v-else class="fr-badge fr-badge--success"> Actif </span>
        </template>

        <template #body-actions="{ data }">
          <DsfrButton
            size="sm"
            tertiary
            icon="ri-delete-bin-line"
            label="Révoquer"
            :disabled="isLoading"
            @click="requestRevokeToken(data.actions.id)"
          />
        </template>
      </RefAppTable>
    </section>

    <section>
      <h2 class="fr-h3 fr-mb-2w">Tokens utilisateurs</h2>
      <p class="fr-text--sm">Tokens personnels créés par les utilisateurs depuis leur profil.</p>

      <div v-if="isPersonalLoading && personalTokens.length === 0" class="fr-py-6w fr-text--center">Chargement...</div>

      <div v-else-if="personalTokens.length === 0" class="fr-card fr-p-3w">
        <p class="fr-text--center fr-mb-0">Aucun token utilisateur créé pour le moment.</p>
      </div>

      <RefAppTable
        v-else
        :items="personalTokenRows"
        :columns="personalTokenColumns"
        :loading="isPersonalLoading"
        :lazy="true"
        :paginator="true"
        :rows="personalTokenPageSize"
        :first="personalTokenFirstIndex"
        :total-records="personalTokensTotal"
        data-testid="admin-personal-tokens-table"
        @page="onPersonalTokenPage"
      >
        <template #body-expiresAt="{ data }">
          {{ formatDate(data.expiresAt) }}
        </template>

        <template #body-status="{ data }">
          <span v-if="isExpiredStatus(data.status)" class="fr-badge fr-badge--error"> Expiré </span>
          <span v-else class="fr-badge fr-badge--success"> Actif </span>
        </template>

        <template #body-actions="{ data }">
          <DsfrButton
            size="sm"
            tertiary
            icon="ri-delete-bin-line"
            label="Révoquer"
            :disabled="isLoading"
            @click="requestRevokeToken(data.actions.id)"
          />
        </template>
      </RefAppTable>
    </section>

    <DsfrModal :opened="showRevokeConfirmation" title="Confirmer la révocation" size="sm" @close="cancelRevokeToken">
      <p>Êtes-vous sûr de vouloir révoquer ce token ? Cette action est irréversible.</p>
      <template #footer>
        <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
          <DsfrButton label="Annuler" secondary @click="cancelRevokeToken" />
          <DsfrButton label="Révoquer" @click="confirmRevokeToken" />
        </DsfrButtonGroup>
      </template>
    </DsfrModal>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.token-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: var(--background-contrast-grey);
  padding: 1rem;
  border-radius: 0.25rem;
}

.token-value {
  flex: 1;
  font-family: monospace;
  font-size: 0.875rem;
  word-break: break-all;
  background-color: var(--background-default-grey);
  padding: 0.5rem;
  border-radius: 0.25rem;
}
</style>
