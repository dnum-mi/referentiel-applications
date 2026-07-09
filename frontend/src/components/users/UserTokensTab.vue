<script setup lang="ts">
import type { CreatePersonalTokenDto, ExposedTokenDto, TokenDto } from "@/client/types.gen";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import api from "@/api";
import { TokenKindWording } from "@/utils/token-utils";

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

  const min = new Date();
  min.setDate(min.getDate() + 1);
  const max = new Date();
  max.setFullYear(max.getFullYear() + 1);
  const expiresAt = newToken.value.expiresAt ? new Date(newToken.value.expiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt < min || expiresAt > max) {
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
  if (!validateForm()) return;

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

function isExpired(token: TokenDto): boolean {
  return token.status === "expired";
}

function isRevoked(token: TokenDto): boolean {
  return token.status === "revoked";
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
  <div class="fr-mt-3w">
    <h2 class="fr-h3 fr-mb-2w">Tokens applicatifs</h2>
    <p class="fr-text--sm fr-mb-3w">
      Les tokens applicatifs vous permettent d'accéder à l'API du référentiel. Vous pouvez créer jusqu'à 5 tokens personnels.
    </p>

    <div ref="messageRef">
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
      </DsfrAlert>
    </div>

    <div class="fr-mb-3w">
      <DsfrButton v-if="!showCreateForm" icon="ri-add-line" :disabled="maxTokensReached" @click="toggleCreateForm">
        Créer un nouveau token
      </DsfrButton>
      <span v-if="maxTokensReached" class="fr-ml-2w fr-text--sm fr-text--bold"> Limite de 5 tokens atteinte </span>
    </div>

    <div v-if="showCreateForm" class="fr-card fr-p-3w fr-mb-3w">
      <h3 class="fr-h5 fr-mb-2w">Nouveau token</h3>
      <form @submit.prevent="createToken">
        <p class="fr-text--sm" data-testid="token-required-fields-hint">* = champs obligatoires</p>
        <DsfrInputGroup
          v-model.trim="newToken.name"
          label="Nom"
          label-visible
          required
          hint="Nom du service ou de l'application utilisant ce token"
          :error-message="fieldErrors.name"
        />

        <DsfrInputGroup
          v-model.trim="newToken.description"
          label="Description"
          label-visible
          required
          hint="Description de l'usage du token"
          :error-message="fieldErrors.description"
        />

        <DsfrInputGroup
          v-model="newToken.expiresAt"
          label="Date d'expiration"
          label-visible
          required
          type="date"
          hint="La date ne peut être comprise qu'entre demain et 1 an maximum, format : JJ/MM/AAAA"
          :error-message="fieldErrors.expiresAt"
        />

        <div class="fr-mt-2w">
          <DsfrButton type="submit" :disabled="isLoading"> Créer le token </DsfrButton>
          <DsfrButton type="button" secondary class="fr-ml-2w" @click="toggleCreateForm"> Annuler </DsfrButton>
        </div>
      </form>
    </div>

    <div v-if="isLoading && tokens.length === 0" class="fr-py-6w fr-text--center">Chargement...</div>

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
          <DsfrButton label="Annuler" secondary @click="cancelRevokeToken" />
          <DsfrButton label="Révoquer" @click="confirmRevokeToken" />
        </DsfrButtonGroup>
      </template>
    </DsfrModal>
  </div>
</template>

<style scoped>
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
