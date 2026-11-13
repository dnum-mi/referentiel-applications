<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { sbomApi, sbomDate, sbomErrorMessage, SbomRequestError, type SbomPreview, type SbomSource } from "@/services/sbom";
import SbomChanges from "./SbomChanges.vue";

const props = defineProps<{ applicationId: string; canEdit: boolean; sources: SbomSource[] }>();
const emit = defineEmits<{ imported: [] }>();
const uid = useId();
const opened = ref(false);
const selectedSource = ref("");
const sourceName = ref("");
const context = ref("");
const projectVersion = ref("");
const file = ref<File | null>(null);
const preview = ref<SbomPreview | null>(null);
const busy = ref(false);
const error = ref("");
const message = ref("");
const trigger = ref<HTMLButtonElement | null>(null);
const heading = ref<HTMLElement | null>(null);
const errorElement = ref<HTMLElement | null>(null);
const previewHeading = ref<HTMLElement | null>(null);
let operation = 0;
let controller: AbortController | undefined;

const existingSource = computed(() => props.sources.find((source) => source.id === selectedSource.value));
const chosenName = computed(() => existingSource.value?.name ?? sourceName.value.trim());

function invalidate() {
  operation++;
  controller?.abort();
  busy.value = false;
}

function clearForm() {
  invalidate();
  opened.value = false;
  preview.value = null;
  file.value = null;
  selectedSource.value = "";
  sourceName.value = "";
  context.value = "";
  projectVersion.value = "";
  error.value = "";
}

watch(
  () => [props.applicationId, props.canEdit],
  () => {
    clearForm();
    message.value = "";
  },
  { flush: "sync" },
);
onBeforeUnmount(invalidate);

watch(selectedSource, () => {
  context.value = existingSource.value?.context ?? "";
});

async function open() {
  if (!props.canEdit) return;
  clearForm();
  message.value = "";
  opened.value = true;
  await nextTick();
  heading.value?.focus();
}

async function cancel() {
  clearForm();
  message.value = "Import annulé. L’inventaire n’a pas été modifié.";
  await nextTick();
  trigger.value?.focus();
}

function chooseFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null;
  error.value = "";
}

async function analyze() {
  if (!props.canEdit || busy.value) return;
  error.value = "";
  if (!file.value || !chosenName.value) {
    error.value = "Choisissez un fichier et renseignez une source avant de lancer l’analyse.";
    await nextTick();
    errorElement.value?.focus();
    return;
  }
  if (!selectedSource.value && props.sources.some((source) => source.name.toLocaleLowerCase() === chosenName.value.toLocaleLowerCase())) {
    error.value = "Cette source existe déjà. Sélectionnez-la dans la liste pour prévisualiser son remplacement.";
    await nextTick();
    errorElement.value?.focus();
    return;
  }
  invalidate();
  const request = operation;
  const applicationId = props.applicationId;
  controller = new AbortController();
  busy.value = true;
  try {
    const result = await sbomApi.preview(
      applicationId,
      {
        file: file.value,
        sourceName: chosenName.value,
        ...(context.value.trim() ? { context: context.value.trim() } : {}),
        ...(projectVersion.value.trim() ? { projectVersion: projectVersion.value.trim() } : {}),
      },
      controller.signal,
    );
    if (request !== operation) return;
    preview.value = result;
    await nextTick();
    previewHeading.value?.focus();
  } catch (cause) {
    if (request !== operation) return;
    error.value = sbomErrorMessage(cause);
    await nextTick();
    errorElement.value?.focus();
  } finally {
    if (request === operation) busy.value = false;
  }
}

async function confirm() {
  if (!preview.value || busy.value || !props.canEdit) return;
  const request = ++operation;
  const applicationId = props.applicationId;
  const importId = preview.value.id;
  controller = new AbortController();
  busy.value = true;
  error.value = "";
  try {
    const result = await sbomApi.commit(applicationId, importId, controller.signal);
    if (request !== operation) return;
    clearForm();
    message.value = result.unchanged ? "SBOM vérifié : l’inventaire est inchangé." : "SBOM importé. L’inventaire a été mis à jour.";
    emit("imported");
    await nextTick();
    trigger.value?.focus();
  } catch (cause) {
    if (request !== operation) return;
    error.value = sbomErrorMessage(cause);
    if (cause instanceof SbomRequestError && [403, 409, 410].includes(cause.status ?? 0)) preview.value = null;
    await nextTick();
    errorElement.value?.focus();
  } finally {
    if (request === operation) busy.value = false;
  }
}
</script>

<template>
  <div class="fr-mb-3w" data-testid="sbom-import">
    <p role="status" aria-live="polite" aria-atomic="true">{{ message }}</p>
    <button v-if="canEdit && !opened" ref="trigger" type="button" class="fr-btn fr-btn--secondary" @click="open">Importer un SBOM</button>
    <section v-if="canEdit && opened" :aria-labelledby="`${uid}-title`" class="fr-callout">
      <h4 :id="`${uid}-title`" ref="heading" tabindex="-1">Importer un inventaire SBOM</h4>
      <p>Choisissez explicitement la source à alimenter. L’import conserve les autres sources et les technologies saisies à la main.</p>
      <div v-if="error" ref="errorElement" class="fr-alert fr-alert--error fr-mb-2w" role="alert" tabindex="-1">{{ error }}</div>
      <form v-if="!preview" :aria-busy="busy" @submit.prevent="analyze">
        <fieldset class="fr-fieldset" :disabled="busy">
          <legend class="fr-fieldset__legend">Fichier et source</legend>
          <div class="fr-fieldset__element">
            <label :for="`${uid}-source`" class="fr-label">Source de l’inventaire</label>
            <select :id="`${uid}-source`" v-model="selectedSource" class="fr-select">
              <option value="">Créer une source</option>
              <option v-for="source in sources" :key="source.id" :value="source.id">
                {{ source.name }}{{ source.active ? "" : " (inactive)" }}
              </option>
            </select>
          </div>
          <div v-if="!selectedSource" class="fr-fieldset__element">
            <label :for="`${uid}-name`" class="fr-label"
              >Nom de la nouvelle source (obligatoire)<span class="fr-hint-text"
                >Par exemple : frontend-production ou backend-production.</span
              ></label
            >
            <input :id="`${uid}-name`" v-model="sourceName" class="fr-input" required maxlength="160" autocomplete="off" />
          </div>
          <div class="fr-fieldset__element">
            <label :for="`${uid}-context`" class="fr-label">Contexte (facultatif)</label>
            <input :id="`${uid}-context`" v-model="context" class="fr-input" maxlength="500" />
          </div>
          <div class="fr-fieldset__element">
            <label :for="`${uid}-version`" class="fr-label">Version du projet (facultatif)</label>
            <input :id="`${uid}-version`" v-model="projectVersion" class="fr-input" maxlength="255" />
          </div>
          <div class="fr-fieldset__element">
            <label :for="`${uid}-file`" class="fr-label"
              >Fichier SBOM JSON (obligatoire)<span :id="`${uid}-formats`" class="fr-hint-text"
                >CycloneDX 1.5, 1.6 ou 1.7 ; SPDX 2.3. Limite par défaut : 20 Mio. Les archives, fichiers XML et liens distants ne sont pas
                acceptés.</span
              ></label
            >
            <input
              :id="`${uid}-file`"
              type="file"
              class="fr-upload"
              accept=".json,application/json"
              required
              :aria-describedby="`${uid}-formats`"
              @change="chooseFile"
            />
          </div>
        </fieldset>
        <div class="fr-btns-group fr-btns-group--inline-md">
          <button type="submit" class="fr-btn" :disabled="busy">{{ busy ? "Analyse en cours…" : "Analyser le fichier" }}</button>
          <button type="button" class="fr-btn fr-btn--secondary" @click="cancel">Annuler l’import</button>
        </div>
      </form>
      <div v-else :aria-busy="busy">
        <h5 ref="previewHeading" tabindex="-1">Prévisualisation de la source {{ preview.sourceName }}</h5>
        <p>
          {{ preview.format }} {{ preview.specVersion }} · {{ preview.totalComponents }} composants<span v-if="preview.projectVersion">
            · Projet {{ preview.projectVersion }}</span
          >
        </p>
        <ul>
          <li>{{ preview.counts.added }} ajouts</li>
          <li>{{ preview.counts.removed }} retraits de cette source</li>
          <li>{{ preview.counts.changed }} changements</li>
          <li>{{ preview.counts.unchanged }} éléments inchangés</li>
        </ul>
        <p v-if="preview.unchanged">L’inventaire de cette source est identique. La confirmation conservera une trace de sa vérification.</p>
        <SbomChanges :changes="preview.changes" />
        <div v-if="preview.warnings.length" class="fr-alert fr-alert--warning fr-mb-2w">
          <h6>Avertissements de l’analyse</h6>
          <ul>
            <li v-for="(warning, index) in preview.warnings" :key="index">{{ warning }}</li>
          </ul>
        </div>
        <p>
          Analyse valable jusqu’au {{ sbomDate(preview.expiresAt) }}. Un SBOM décrit un inventaire déclaré, sans garantir son exhaustivité
          ni son déploiement effectif.
        </p>
        <div class="fr-btns-group fr-btns-group--inline-md">
          <button type="button" class="fr-btn" :disabled="busy" @click="confirm">
            {{ busy ? "Confirmation en cours…" : "Confirmer l’import" }}
          </button>
          <button type="button" class="fr-btn fr-btn--secondary" :disabled="busy" @click="cancel">Annuler l’import</button>
        </div>
      </div>
    </section>
  </div>
</template>
