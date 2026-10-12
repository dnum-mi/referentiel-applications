<script setup lang="ts">
import type { CreatePersonalTokenDto, ExposedTokenDto, TokenDto } from "@/client/types.gen";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import api from "@/api";
import { TokenKindWording } from "@/utils/token-utils";
import { useUserStore } from "@/stores/userStore";

// #1985 : en session sans authentification forte, le backend refuse la création d'un jeton
// personnel (403 `stepDown`) — on l'explique avant plutôt que d'échouer après.
const userStore = useUserStore();
const weakAuth = computed(() => userStore.isAuthDowngraded);

const tokens = ref<TokenDto[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const showCreateForm = ref(false);
const newlyCreatedToken = ref<ExposedTokenDto | null>(null);
const showDeleteConfirmation = ref(false);
const tokenToRevoke = ref<string | null>(null);

const newToken = ref<CreatePersonalTokenDto>({
  name: "",
  description: "",
  expiresAt: "",
});

const fieldErrors = ref<{ name?: string; description?: string; expiresAt?: string }>({});
const tokenSection = ref<HTMLElement | null>(null);
const tokenForm = ref<HTMLFormElement | null>(null);

function expirationLimits() {
  const min = new Date();
  min.setDate(min.getDate() + 1);
  const max = new Date();
  max.setFullYear(max.getFullYear() + 1);
  return { min: format(min, "yyyy-MM-dd"), max: format(max, "yyyy-MM-dd") };
}

const maxTokensReached = computed(() => tokens.value.length >= 5);

function resetForm() {
  newToken.value = { name: "", description: "", expiresAt: "" };
  fieldErrors.value = {};
}

function validateForm(): boolean {
  fieldErrors.value = {};

  if (!newToken.value.name.trim()) {
    fieldErrors.value.name = "Veuillez saisir le nom";
  }
  if (!newToken.value.description.trim()) {
    fieldErrors.value.description = "Veuillez saisir la description";
  }

  const limits = expirationLimits();
  const expiration = newToken.value.expiresAt || "";
  const expiresAt = expiration ? new Date(expiration) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiration < limits.min || expiration > limits.max) {
    fieldErrors.value.expiresAt =
      "Veuillez saisir la date d'expiration, comprise entre demain et 1 an maximum, format attendu : JJ/MM/AAAA";
  }

  return Object.keys(fieldErrors.value).length === 0;
}

function resetMessages() {
  error.value = null;
  successMessage.value = null;
}

// 12.8 : après création/révocation, porter le focus au début du message de statut (succès ou erreur).
const messageRef = useTemplateRef<HTMLElement>("messageRef");

async function focusMessage() {
  await nextTick();
  const el = messageRef.value;
  if (el) {
    el.setAttribute("tabindex", "-1");
    el.focus();
  }
}

async function fetchTokens() {
  isLoading.value = true;
  error.value = null;

  const response = await api.tokenControllerFindPersonal();
  if (response.error) {
    error.value = "Erreur lors du chargement des tokens";
    isLoading.value = false;
    return;
  }

  tokens.value = response.data || [];
  isLoading.value = false;
}

async function createToken() {
  if (!validateForm()) {
    await nextTick();
    const firstError = (["name", "description", "expiresAt"] as const).find((field) => fieldErrors.value[field]);
    if (firstError) tokenForm.value?.querySelector<HTMLInputElement>(`[id="token-${firstError}"]`)?.focus();
    return;
  }

  isLoading.value = true;
  newlyCreatedToken.value = null;
  resetMessages();

  const response = await api.tokenControllerCreatePersonal({ body: newToken.value });
  if (response.error) {
    error.value = "Erreur lors de la création du token";
    isLoading.value = false;
    await focusMessage();
    return;
  }

  if (!response.data) {
    error.value = "Erreur lors de la création du token";
    isLoading.value = false;
    await focusMessage();
    return;
  }

  newlyCreatedToken.value = response.data;
  successMessage.value = "Token créé avec succès";
  resetForm();
  showCreateForm.value = false;
  await fetchTokens();
  isLoading.value = false;
  await focusMessage();
}

function requestRevokeToken(tokenId: string) {
  tokenToRevoke.value = tokenId;
  showDeleteConfirmation.value = true;
}

async function confirmRevokeToken() {
  if (!tokenToRevoke.value) return;

  isLoading.value = true;
  resetMessages();

  const response = await api.tokenControllerDeletePersonal({ path: { id: tokenToRevoke.value } });
  if (response.error) {
    error.value = "Erreur lors de la révocation du token";
    isLoading.value = false;
    showDeleteConfirmation.value = false;
    tokenToRevoke.value = null;
    await focusMessage();
    return;
  }

  successMessage.value = "Token révoqué avec succès";
  await fetchTokens();
  isLoading.value = false;
  showDeleteConfirmation.value = false;
  tokenToRevoke.value = null;
  await focusMessage();
}

function cancelRevokeToken() {
  showDeleteConfirmation.value = false;
  tokenToRevoke.value = null;
}

async function toggleCreateForm() {
  showCreateForm.value = !showCreateForm.value;
  if (!showCreateForm.value) resetForm();
  await nextTick();
  tokenSection.value?.querySelector<HTMLElement>(showCreateForm.value ? "#token-name" : '[data-testid="token-create-btn"]')?.focus();
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

function isExpired(token: TokenDto): boolean {
  return token.status === "expired";
}

function isRevoked(token: TokenDto): boolean {
  return token.status === "revoked";
}

async function copyToClipboard(text: string) {
  resetMessages();
  try {
    await navigator.clipboard.writeText(text);
    successMessage.value = "Token copié dans le presse-papier";
  } catch {
    error.value = "Impossible de copier le token. Sélectionnez sa valeur pour le copier manuellement.";
  }
}

function dismissNewToken() {
  newlyCreatedToken.value = null;
}

onMounted(() => {
  fetchTokens();
});
</script>

<template>
  <div ref="tokenSection" class="fr-mt-3w">
    <h2 class="fr-h3 fr-mb-2w">Tokens applicatifs</h2>
    <p class="fr-text--sm fr-mb-3w">
      Les tokens applicatifs vous permettent d'accéder à l'API du référentiel. Vous pouvez créer jusqu'à 5 tokens personnels.
    </p>

    <div ref="messageRef">
      <output aria-live="polite" aria-atomic="true" class="fr-sr-only">{{ successMessage }}</output>
      <DsfrAlert v-if="error" alert type="error" :title="error" class="fr-mb-2w" closeable @close="error = null" />

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
          <DsfrButton
            size="sm"
            secondary
            icon="ri-file-copy-line"
            aria-label="Copier le token"
            @click="copyToClipboard(newlyCreatedToken.password)"
          >
            Copier
          </DsfrButton>
        </div>
        <p v-if="successMessage === 'Token copié dans le presse-papier'" class="fr-valid-text">{{ successMessage }}</p>
      </DsfrAlert>
    </div>

    <DsfrAlert
      v-if="weakAuth"
      type="warning"
      title="Authentification forte requise"
      description="La création d'un jeton personnel nécessite une connexion avec votre carte agent ou la double authentification. Vos jetons existants restent consultables et révocables."
      class="fr-mb-2w"
      data-testid="token-weak-auth-alert"
    />

    <div class="fr-mb-3w">
      <DsfrButton
        v-if="!showCreateForm"
        icon="ri-add-line"
        :disabled="maxTokensReached || weakAuth"
        data-testid="token-create-btn"
        @click="toggleCreateForm"
      >
        Créer un nouveau token
      </DsfrButton>
      <span v-if="maxTokensReached" class="fr-ml-2w fr-text--sm fr-text--bold"> Limite de 5 tokens atteinte </span>
    </div>

    <div v-if="showCreateForm" class="fr-card fr-p-3w fr-mb-3w">
      <h3 class="fr-h5 fr-mb-2w">Nouveau token</h3>
      <form ref="tokenForm" novalidate @submit.prevent="createToken">
        <p class="fr-text--sm" data-testid="token-required-fields-hint">* = champs obligatoires</p>
        <DsfrInputGroup
          id="token-name"
          v-model.trim="newToken.name"
          label="Nom"
          label-visible
          required
          hint="Nom du service ou de l'application utilisant ce token"
          :error-message="fieldErrors.name"
          description-id="token-name-error"
          :aria-invalid="fieldErrors.name ? true : undefined"
        />

        <DsfrInputGroup
          id="token-description"
          v-model.trim="newToken.description"
          label="Description"
          label-visible
          required
          hint="Description de l'usage du token"
          :error-message="fieldErrors.description"
          description-id="token-description-error"
          :aria-invalid="fieldErrors.description ? true : undefined"
        />

        <DsfrInputGroup
          id="token-expiresAt"
          v-model="newToken.expiresAt"
          label="Date d'expiration"
          label-visible
          required
          type="date"
          :min="expirationLimits().min"
          :max="expirationLimits().max"
          hint="La date ne peut être comprise qu'entre demain et 1 an maximum, format : JJ/MM/AAAA"
          :error-message="fieldErrors.expiresAt"
          description-id="token-expiresAt-error"
          :aria-invalid="fieldErrors.expiresAt ? true : undefined"
        />

        <div class="fr-mt-2w">
          <DsfrButton type="submit" :disabled="isLoading"> Créer le token </DsfrButton>
          <DsfrButton type="button" secondary class="fr-ml-2w" @click="toggleCreateForm"> Annuler </DsfrButton>
        </div>
      </form>
    </div>

    <output
      v-if="isLoading && tokens.length === 0"
      class="token-loading-status fr-py-6w fr-text--center"
      aria-live="polite"
      aria-atomic="true"
      >Chargement...</output
    >

    <div v-else-if="tokens.length === 0" class="fr-card fr-p-3w">
      <p class="fr-text--center fr-mb-0">Aucun token créé pour le moment.</p>
    </div>

    <DsfrTable
      v-else
      title="Liste de vos tokens"
      :headers="['Type', 'Nom', 'Description', 'Date d\'expiration', 'Statut', 'Actions']"
      class="fr-table--layout-fixed"
    >
      <tr v-for="token in tokens" :key="token.id">
        <td>{{ TokenKindWording[token.kind] }}</td>
        <td>{{ token.name }}</td>
        <td>{{ token.description }}</td>
        <td>{{ formatDate(token.expiresAt) }}</td>
        <td>
          <span v-if="isExpired(token)" class="fr-badge fr-badge--error"> Expiré </span>
          <span v-else-if="isRevoked(token)" class="fr-badge fr-badge--warning"> Révoqué </span>
          <span v-else class="fr-badge fr-badge--success"> Actif </span>
        </td>
        <td>
          <DsfrButton
            size="sm"
            tertiary
            icon="ri-delete-bin-line"
            label="Révoquer"
            :aria-label="`Révoquer le token ${token.name}`"
            :disabled="isLoading"
            @click="requestRevokeToken(token.id)"
          />
        </td>
      </tr>
    </DsfrTable>

    <DsfrModal :opened="showDeleteConfirmation" title="Confirmer la révocation" size="sm" @close="cancelRevokeToken">
      <p>Êtes-vous sûr de vouloir révoquer ce token ? Cette action est irréversible.</p>
      <template #footer>
        <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
          <li><DsfrButton label="Annuler" secondary @click="cancelRevokeToken" /></li>
          <li><DsfrButton label="Révoquer" @click="confirmRevokeToken" /></li>
        </DsfrButtonGroup>
      </template>
    </DsfrModal>
  </div>
</template>

<style scoped>
.token-loading-status {
  display: block;
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
