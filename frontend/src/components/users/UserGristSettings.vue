<script setup lang="ts">
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { computed, ref, watch } from "vue";

// Mêmes règles que UpdateUserPreferencesDto (backend) : un identifiant de document, pas une URL.
const GRIST_DOC_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const GRIST_DOC_IDS_MAX = 20;
const DEFAULT_GRIST_URL = "https://grist.numerique.gouv.fr";

const userStore = useUserStore();
const toaster = useToasterStore();

const docIds = computed(() => userStore.user?.gristDocIds ?? []);
const hasApiKey = computed(() => !!userStore.user?.hasGristApiKey);
const isUpdating = ref(false);

// --- Connexion : instance et clé d'API ---
const url = ref(userStore.user?.gristUrl ?? DEFAULT_GRIST_URL);
watch(
  () => userStore.user?.gristUrl,
  (saved) => {
    if (saved) url.value = saved;
  },
);
// La clé enregistrée n'est jamais relue : le champ ne sert qu'à en saisir une nouvelle. Quand une
// clé existe, des points en placeholder le montrent rempli, sans valeur factice à envoyer.
const API_KEY_MASK = "••••••••••••••••";
const apiKey = ref("");
const connectionError = ref("");

async function save(settings: Parameters<typeof userStore.updateGristSettings>[0], successMessage: string): Promise<boolean> {
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
  const gristUrl = url.value.trim();
  const gristApiKey = apiKey.value.trim();
  if (!/^https:\/\/\S+$/.test(gristUrl)) {
    connectionError.value = "Saisissez l'adresse HTTPS de l'instance Grist.";
    return;
  }
  if (!gristApiKey && !hasApiKey.value) {
    connectionError.value = "Saisissez votre clé d'API Grist.";
    return;
  }
  connectionError.value = "";
  const saved = await save({ gristUrl, ...(gristApiKey && { gristApiKey }) }, "Votre connexion Grist a été enregistrée.");
  if (saved) apiKey.value = "";
}

function removeApiKey() {
  return save({ gristApiKey: null }, "Votre clé d'API Grist a été supprimée.");
}

// --- Documents ---
const newDocId = ref("");
const docIdError = ref("");

async function addDocument() {
  const docId = newDocId.value.trim();
  if (!GRIST_DOC_ID_PATTERN.test(docId)) {
    docIdError.value = "Saisissez l'identifiant du document (lettres, chiffres, - et _), pas son URL.";
    return;
  }
  if (docIds.value.includes(docId)) {
    docIdError.value = "Ce document est déjà dans la liste.";
    return;
  }
  if (docIds.value.length >= GRIST_DOC_IDS_MAX) {
    docIdError.value = `Vous ne pouvez pas synchroniser plus de ${GRIST_DOC_IDS_MAX} documents.`;
    return;
  }
  docIdError.value = "";
  if (await save({ gristDocIds: [...docIds.value, docId] }, `Le document ${docId} a été ajouté.`)) {
    newDocId.value = "";
  }
}

function removeDocument(docId: string) {
  return save({ gristDocIds: docIds.value.filter((id) => id !== docId) }, `Le document ${docId} a été retiré.`);
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
    <form class="user-grist-form fr-mb-3w" data-testid="user-grist-connection" @submit.prevent="saveConnection">
      <DsfrInputGroup v-model="url" label="Adresse de l'instance Grist" label-visible data-testid="user-grist-url-input" />
      <DsfrInputGroup
        v-model="apiKey"
        type="password"
        autocomplete="off"
        label="Clé d'API"
        label-visible
        :placeholder="hasApiKey ? API_KEY_MASK : undefined"
        :class="{ 'user-grist-api-key--saved': hasApiKey }"
        :hint="
          hasApiKey
            ? 'Une clé est enregistrée. Saisissez-en une nouvelle pour la remplacer.'
            : 'À créer dans Grist : Paramètres du profil → Clé d\'API.'
        "
        data-testid="user-grist-api-key-input"
      />
      <DsfrButton type="submit" class="fr-btn--secondary" :disabled="isUpdating" data-testid="user-grist-connection-save">
        Enregistrer
      </DsfrButton>
      <DsfrButton
        v-if="hasApiKey"
        type="button"
        class="fr-btn--tertiary"
        :disabled="isUpdating"
        data-testid="user-grist-api-key-remove"
        @click="removeApiKey"
      >
        Supprimer la clé
      </DsfrButton>
    </form>
    <p v-if="connectionError" class="fr-error-text fr-mt-n2w fr-mb-3w" role="alert" data-testid="user-grist-connection-error">
      {{ connectionError }}
    </p>

    <h3 class="fr-text--md fr-text--bold fr-mb-1w">Documents</h3>
    <ul v-if="docIds.length" class="fr-raw-list fr-mb-2w" data-testid="user-grist-documents-list">
      <li v-for="docId in docIds" :key="docId" class="fr-mb-1w" data-testid="user-grist-document">
        <code>{{ docId }}</code>
        <DsfrButton
          class="fr-btn--tertiary fr-btn--sm fr-ml-2w"
          :disabled="isUpdating"
          :title="`Retirer le document ${docId}`"
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
        v-model="newDocId"
        label="Identifiant du document"
        label-visible
        hint="Dans l'URL du document, juste après l'adresse de l'instance."
        :error-message="docIdError"
        data-testid="user-grist-document-input"
      />
      <DsfrButton type="submit" class="fr-btn--secondary" :disabled="isUpdating || !newDocId.trim()" data-testid="user-grist-document-add">
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
/* Les points d'une clé enregistrée ont la couleur d'une saisie, pas celle d'un placeholder. */
.user-grist-form :deep(.user-grist-api-key--saved::placeholder) {
  color: var(--text-default-grey);
  opacity: 1;
}

.user-grist-form :deep(.fr-input),
.user-grist-form :deep(.fr-messages-group:empty) {
  margin-bottom: 0;
}
</style>
