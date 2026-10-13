<script setup lang="ts">
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { computed, nextTick, ref, useId } from "vue";

// Mêmes règles que UpdateUserPreferencesDto (backend) : un identifiant de document, pas une URL.
const GRIST_DOC_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const GRIST_DOC_IDS_MAX = 20;
const DEFAULT_GRIST_URL = "https://grist.numerique.gouv.fr";

const userStore = useUserStore();
const toaster = useToasterStore();

const docIds = computed(() => userStore.user?.gristDocIds ?? []);
const hasApiKey = computed(() => !!userStore.user?.hasGristApiKey);
const isUpdating = ref(false);
const id = useId();
const urlInputId = `${id}-grist-url`;
const apiKeyInputId = `${id}-grist-api-key`;
const docIdInputId = `${id}-grist-document`;

// --- Connexion : instance et clé d'API ---
const urlDraft = ref<string>();
const url = computed({
  get: () => urlDraft.value ?? userStore.user?.gristUrl ?? DEFAULT_GRIST_URL,
  set: (value) => {
    urlDraft.value = value;
  },
});
// La clé enregistrée n'est jamais relue : le champ ne sert qu'à en saisir une nouvelle.
const apiKey = ref("");
const urlError = ref("");
const apiKeyError = ref("");

async function focusInput(inputId: string) {
  await nextTick();
  document.getElementById(inputId)?.focus();
}

async function restoreFocusAfterRemoval(origin: Element | null, inputId: string) {
  await nextTick();
  if (origin && !origin.isConnected && document.activeElement === document.body) {
    document.getElementById(inputId)?.focus();
  }
}

async function save(settings: Parameters<typeof userStore.updateGristSettings>[0], successMessage: string): Promise<boolean> {
  if (isUpdating.value) return false;
  isUpdating.value = true;
  try {
    await userStore.updateGristSettings(settings);
    toaster.addSuccessMessage(successMessage);
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la configuration Grist", error);
    toaster.addErrorMessage("Erreur lors de la mise à jour de votre configuration Grist. Veuillez réessayer.");
    return false;
  } finally {
    isUpdating.value = false;
  }
}

async function saveConnection() {
  if (isUpdating.value) return;
  const submittedUrl = url.value;
  const submittedApiKey = apiKey.value;
  const gristUrl = submittedUrl.trim();
  const gristApiKey = submittedApiKey.trim();
  urlError.value = /^https:\/\/\S+$/.test(gristUrl) ? "" : "Saisissez l'adresse HTTPS de l'instance Grist.";
  apiKeyError.value = gristApiKey || hasApiKey.value ? "" : "Saisissez votre clé d'API Grist.";
  if (urlError.value || apiKeyError.value) {
    await focusInput(urlError.value ? urlInputId : apiKeyInputId);
    return;
  }
  const saved = await save({ gristUrl, ...(gristApiKey && { gristApiKey }) }, "Votre connexion Grist a été enregistrée.");
  if (saved) {
    if (url.value === submittedUrl) urlDraft.value = undefined;
    if (apiKey.value === submittedApiKey) apiKey.value = "";
  }
}

async function removeApiKey() {
  const origin = document.activeElement;
  if (await save({ gristApiKey: null }, "Votre clé d'API Grist a été supprimée.")) {
    await restoreFocusAfterRemoval(origin, apiKeyInputId);
  }
}

// --- Documents ---
const newDocId = ref("");
const docIdError = ref("");

async function addDocument() {
  if (isUpdating.value) return;
  const submittedDocId = newDocId.value;
  const docId = submittedDocId.trim();
  if (!GRIST_DOC_ID_PATTERN.test(docId)) {
    docIdError.value = "Saisissez l'identifiant du document (6 à 64 lettres, chiffres, - ou _), pas son URL.";
    await focusInput(docIdInputId);
    return;
  }
  if (docIds.value.includes(docId)) {
    docIdError.value = "Ce document est déjà dans la liste.";
    await focusInput(docIdInputId);
    return;
  }
  if (docIds.value.length >= GRIST_DOC_IDS_MAX) {
    docIdError.value = `Vous ne pouvez pas synchroniser plus de ${GRIST_DOC_IDS_MAX} documents.`;
    await focusInput(docIdInputId);
    return;
  }
  docIdError.value = "";
  if ((await save({ gristDocIds: [...docIds.value, docId] }, `Le document ${docId} a été ajouté.`)) && newDocId.value === submittedDocId) {
    newDocId.value = "";
  }
}

async function removeDocument(docId: string) {
  const origin = document.activeElement;
  if (await save({ gristDocIds: docIds.value.filter((id) => id !== docId) }, `Le document ${docId} a été retiré.`)) {
    await restoreFocusAfterRemoval(origin, docIdInputId);
  }
}
</script>

<template>
  <section data-testid="user-grist-settings">
    <h2 class="fr-h6">Synchronisation Grist</h2>
    <p class="fr-text--sm">
      Le bouton « Synchroniser avec Grist » de la recherche met à jour les documents ci-dessous, avec votre clé d'API. Votre compte Grist
      doit être propriétaire de ces documents.
    </p>

    <h3 class="fr-text--md fr-text--bold fr-mb-1w">Connexion</h3>
    <form class="user-grist-form fr-mb-3w" novalidate data-testid="user-grist-connection" @submit.prevent="saveConnection">
      <DsfrInputGroup
        :id="urlInputId"
        v-model="url"
        type="url"
        label="Adresse de l'instance Grist (obligatoire)"
        label-visible
        hint="Adresse HTTPS, par exemple https://grist.numerique.gouv.fr."
        aria-required="true"
        :aria-invalid="!!urlError"
        :error-message="urlError"
        data-testid="user-grist-url-input"
      />
      <DsfrInputGroup
        :id="apiKeyInputId"
        v-model="apiKey"
        type="password"
        autocomplete="off"
        :label="hasApiKey ? 'Clé d’API' : 'Clé d’API (obligatoire)'"
        label-visible
        :aria-required="!hasApiKey"
        :aria-invalid="!!apiKeyError"
        :error-message="apiKeyError"
        :hint="
          hasApiKey ? 'Une clé est enregistrée. Laissez vide pour la conserver.' : 'À créer dans Grist : Paramètres du profil → Clé d\'API.'
        "
        data-testid="user-grist-api-key-input"
      />
      <DsfrButton
        type="submit"
        class="fr-btn--secondary"
        :aria-disabled="isUpdating"
        :aria-busy="isUpdating"
        data-testid="user-grist-connection-save"
      >
        Enregistrer
      </DsfrButton>
      <DsfrButton
        v-if="hasApiKey"
        type="button"
        class="fr-btn--tertiary"
        :aria-disabled="isUpdating"
        :aria-busy="isUpdating"
        data-testid="user-grist-api-key-remove"
        @click="removeApiKey"
      >
        Supprimer la clé
      </DsfrButton>
    </form>
    <p role="status" class="fr-sr-only">{{ isUpdating ? "Enregistrement de votre configuration Grist…" : "" }}</p>

    <h3 class="fr-text--md fr-text--bold fr-mb-1w">Documents</h3>
    <ul v-if="docIds.length" class="fr-raw-list fr-mb-2w" data-testid="user-grist-documents-list">
      <li v-for="docId in docIds" :key="docId" class="fr-mb-1w" data-testid="user-grist-document">
        <code>{{ docId }}</code>
        <DsfrButton
          class="fr-btn--tertiary fr-btn--sm fr-ml-2w"
          :aria-disabled="isUpdating"
          :aria-busy="isUpdating"
          :title="`Retirer le document ${docId}`"
          :aria-label="`Retirer le document ${docId}`"
          data-testid="user-grist-document-remove"
          @click="removeDocument(docId)"
        >
          Retirer
        </DsfrButton>
      </li>
    </ul>
    <p v-else class="fr-text--sm" data-testid="user-grist-documents-empty">Aucun document : la synchronisation est désactivée.</p>
    <form class="user-grist-form" @submit.prevent="addDocument">
      <DsfrInputGroup
        :id="docIdInputId"
        v-model="newDocId"
        label="Identifiant du document (obligatoire)"
        label-visible
        hint="Dans l'URL du document, juste après l'adresse de l'instance : 6 à 64 lettres, chiffres, - ou _."
        aria-required="true"
        :aria-invalid="!!docIdError"
        :error-message="docIdError"
        data-testid="user-grist-document-input"
      />
      <DsfrButton
        type="submit"
        class="fr-btn--secondary"
        :aria-disabled="isUpdating"
        :aria-busy="isUpdating"
        data-testid="user-grist-document-add"
      >
        Ajouter
      </DsfrButton>
    </form>
  </section>
</template>

<style scoped>
.user-grist-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}

/* Le `fr-input-group` du DSFR porte une marge basse : on la retire pour aligner les boutons sur le bas des champs. */
.user-grist-form :deep(.fr-input-group) {
  flex: 1 1 18rem;
  max-width: 30rem;
  margin-bottom: 0;
}

/* Le champ porte lui aussi une marge basse, et la zone de messages (live region des erreurs) est
   toujours rendue : vides, elles ne doivent pas décaler les boutons. */
.user-grist-form :deep(.fr-input),
.user-grist-form :deep(.fr-messages-group:empty) {
  margin-bottom: 0;
}
</style>
