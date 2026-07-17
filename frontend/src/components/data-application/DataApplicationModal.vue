<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { watchDebounced } from "@vueuse/core";
import api from "@/api/index";
import type {
  ApplicationRefDto,
  CreateDataApplicationDto,
  DataApplicationDto,
  DataDescriptionDto,
  DataFamilyDto,
  DataSensibilityDto,
  TagDto,
} from "@/client/types.gen";
import { OpenDataStatus, UpdateFrequency } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import { OPEN_DATA_STATUS_LABELS, UPDATE_FREQUENCY_LABELS } from "@/constants/data-catalog.constants";
import { MIN_CHAR_FOR_SEARCH } from "@/constants/min-char-for-search";
import AccessibleAutocomplete from "@/components/AccessibleAutocomplete.vue";

const NEW_FAMILY_VALUE = "__new__";

const props = defineProps<{
  applicationId: string;
  initialItem?: DataApplicationDto;
  errorMessage: string;
}>();

const emit = defineEmits(["close", "dataCreated", "dataUpdated"]);

const toaster = useToasterStore();
const isSubmitting = ref(false);
const isLoadingOptions = ref(false);
const isSearchingDescriptions = ref(false);

const descriptionsList = ref<DataDescriptionDto[]>([]);
const sensibilitiesList = ref<DataSensibilityDto[]>([]);
const familiesList = ref<DataFamilyDto[]>([]);
const descriptionSearch = ref("");
const descriptionError = ref<string | undefined>(undefined);

// Panneau des informations propres à la donnée d'application (DataDescription) : nom, description,
// URL officielle, famille, tags, applications source. Affiché soit pour en créer une nouvelle
// (bascule manuelle depuis la recherche), soit en édition pour modifier celle déjà liée (identité
// verrouillée, mais ses propres informations restent modifiables).
const isCreatingNewDescription = ref(false);
const descriptionForm = ref({ name: "", description: "", officialUrl: "", familyId: "" });
const newFamilyPath = ref("");
const newDescriptionError = ref<string | undefined>(undefined);
const descriptionTags = ref<TagDto[]>([]);
const descriptionApplicationsSource = ref<ApplicationRefDto[]>([]);

function resetDescriptionFormFields() {
  descriptionForm.value = { name: "", description: "", officialUrl: "", familyId: "" };
  newFamilyPath.value = "";
  newDescriptionError.value = undefined;
  descriptionTags.value = [];
  descriptionApplicationsSource.value = [];
}

async function searchTags(query: string): Promise<TagDto[]> {
  const response = await api.tagsControllerFindAll({ query: { name: query.trim(), page: 0, pageSize: 10 } });
  return response.data?.results ?? [];
}

function addDescriptionTag(tag: TagDto | null) {
  if (tag && !descriptionTags.value.some((t) => t.id === tag.id)) {
    descriptionTags.value = [...descriptionTags.value, tag];
  }
}

function removeDescriptionTag(index: number) {
  descriptionTags.value = descriptionTags.value.filter((_, i) => i !== index);
}

async function searchApplicationsSource(query: string): Promise<ApplicationRefDto[]> {
  const response = await api.applicationControllerSearch({ query: { search: query.trim(), pageSize: 10 } });
  return response.data?.results ?? [];
}

function addDescriptionApplicationSource(application: ApplicationRefDto | null) {
  if (application && !descriptionApplicationsSource.value.some((a) => a.id === application.id)) {
    descriptionApplicationsSource.value = [...descriptionApplicationsSource.value, application];
  }
}

function removeDescriptionApplicationSource(index: number) {
  descriptionApplicationsSource.value = descriptionApplicationsSource.value.filter((_, i) => i !== index);
}

interface DataApplicationForm {
  dataDescriptionId: string;
  sensibilityId: string;
  example: string;
  openDataStatus: OpenDataStatus | "";
  isReference: boolean;
  businessUsage: string;
  documentationUrl: string;
  volumetry?: number;
  monthlyVolumetry?: number;
  updateFrequency: UpdateFrequency | "";
  conservation: string;
}

function emptyForm(): DataApplicationForm {
  return {
    dataDescriptionId: "",
    sensibilityId: "",
    example: "",
    openDataStatus: "",
    isReference: false,
    businessUsage: "",
    documentationUrl: "",
    volumetry: undefined,
    monthlyVolumetry: undefined,
    updateFrequency: "",
    conservation: "",
  };
}

const form = ref<DataApplicationForm>(emptyForm());

function toggleCreateNewDescription(value: boolean) {
  isCreatingNewDescription.value = value;
  resetDescriptionFormFields();
  descriptionSearch.value = "";
}

function formatDescriptionText(description: DataDescriptionDto): string {
  return description.family?.path ? `${description.name} (${description.family.path})` : description.name;
}

// Dérivé de descriptionSearch ET descriptionsList (pas un simple watch sur descriptionSearch) :
// si le texte tapé correspond déjà exactement à une option au moment où la recherche débouncée
// résout la liste (sans que le texte du champ ne change ensuite), un watch sur descriptionSearch
// seul ne se redéclencherait jamais et la sélection resterait invalide malgré un texte correct.
const matchedExistingDescription = computed(() => {
  if (props.initialItem) return null;
  return descriptionsList.value.find((description) => formatDescriptionText(description) === descriptionSearch.value) ?? null;
});

const isExistingDescriptionValid = computed(() => !!matchedExistingDescription.value);

// Valide le panneau d'informations de la donnée (nom + famille si "nouvelle famille" choisie) —
// utilisé aussi bien à la création d'une nouvelle donnée qu'à l'édition de celle déjà liée.
const isDescriptionFieldsValid = computed(() => {
  if (!descriptionForm.value.name.trim()) return false;
  if (descriptionForm.value.familyId === NEW_FAMILY_VALUE && !newFamilyPath.value.trim()) return false;
  return true;
});

const isFormValid = computed(() => {
  if (props.initialItem) return isDescriptionFieldsValid.value;
  return isCreatingNewDescription.value ? isDescriptionFieldsValid.value : isExistingDescriptionValid.value;
});

// Recherche serveur (débouncée) des data descriptions : les données d'application peuvent être
// bien plus nombreuses que ce que l'API accepte de renvoyer en une seule page (max 100).
async function searchDescriptions() {
  if (props.initialItem) return; // champ verrouillé en édition, pas besoin de re-chercher

  if (!descriptionSearch.value || descriptionSearch.value.length < MIN_CHAR_FOR_SEARCH) {
    descriptionsList.value = [];
    return;
  }

  // Le texte affiché après sélection contient le nom ET la famille ("Nom (Famille)"), alors que
  // la recherche serveur ne filtre que sur le nom réel : une nouvelle recherche sur ce texte complet
  // ne trouverait rien et effacerait la sélection valide déjà faite. On ne re-cherche donc que si le
  // texte actuel ne correspond à aucune donnée déjà connue.
  const alreadyResolved = descriptionsList.value.some((description) => formatDescriptionText(description) === descriptionSearch.value);
  if (alreadyResolved) return;

  isSearchingDescriptions.value = true;
  try {
    const response = await api.dataCatalogControllerFindAllDescriptions({
      query: { name: descriptionSearch.value, pageSize: 20 },
    });
    descriptionsList.value = response.data ?? [];
  } catch (error) {
    console.error("Error searching data descriptions:", error);
  } finally {
    isSearchingDescriptions.value = false;
  }
}

watchDebounced(descriptionSearch, searchDescriptions, { debounce: 300 });

async function fetchOptions() {
  isLoadingOptions.value = true;
  try {
    const [sensibilitiesResponse, familiesResponse] = await Promise.all([
      api.dataSensibilityControllerFindAll({ query: { pageSize: 0 } }),
      api.dataFamilyControllerFindAll({ query: { pageSize: 0 } }),
    ]);
    sensibilitiesList.value = sensibilitiesResponse.data?.results ?? [];
    familiesList.value = familiesResponse.data?.results ?? [];
  } catch (error) {
    console.error("Error fetching data catalog options:", error);
    toaster.addErrorMessage("Erreur lors du chargement des options des données d'application.");
  } finally {
    isLoadingOptions.value = false;
  }
}

function setInitialValues() {
  if (!props.initialItem) {
    form.value = emptyForm();
    descriptionSearch.value = "";
    descriptionsList.value = [];
    resetDescriptionFormFields();
    return;
  }

  const item = props.initialItem;
  form.value = {
    dataDescriptionId: item.dataDescriptionId,
    sensibilityId: item.sensibility?.id ?? "",
    example: item.example ?? "",
    openDataStatus: item.openDataStatus ?? "",
    isReference: item.isReference ?? false,
    businessUsage: item.businessUsage ?? "",
    documentationUrl: (item.documentationUrl ?? []).join("\n"),
    volumetry: item.volumetry,
    monthlyVolumetry: item.monthlyVolumetry,
    updateFrequency: item.updateFrequency ?? "",
    conservation: item.conservation ?? "",
  };

  // Champ de recherche verrouillé en édition : on pré-remplit la liste avec la seule donnée déjà
  // liée, pas besoin d'une recherche serveur pour afficher le nom sélectionné. Ses propres
  // informations (nom, famille, tags, applications source), elles, restent modifiables ci-dessous.
  if (item.dataDescription) {
    descriptionsList.value = [item.dataDescription];
    descriptionSearch.value = formatDescriptionText(item.dataDescription);
    descriptionForm.value = {
      name: item.dataDescription.name,
      description: item.dataDescription.description ?? "",
      officialUrl: item.dataDescription.officialUrl ?? "",
      familyId: item.dataDescription.family?.id ?? "",
    };
    newFamilyPath.value = "";
    newDescriptionError.value = undefined;
    descriptionTags.value = item.dataDescription.tags ?? [];
    descriptionApplicationsSource.value = item.dataDescription.applicationsSource ?? [];
  }
}

watch(() => props.initialItem, setInitialValues, { immediate: true });

onMounted(fetchOptions);

onMounted(async () => {
  await nextTick();
  document.querySelector<HTMLButtonElement>('[data-testid="data-application-modal"] .fr-btn--close')?.focus();
});

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

async function resolveFamilyId(): Promise<string | undefined> {
  const familyId = descriptionForm.value.familyId || undefined;
  if (familyId !== NEW_FAMILY_VALUE) return familyId;

  const familyResponse = await api.dataFamilyControllerCreate({
    body: { path: newFamilyPath.value.trim() },
  });
  if (!familyResponse.response.ok || !familyResponse.data) throw new Error("family creation failed");
  return familyResponse.data.id;
}

async function resolveDataDescriptionId(): Promise<string> {
  if (!isCreatingNewDescription.value) {
    return matchedExistingDescription.value?.id ?? "";
  }

  const familyId = await resolveFamilyId();
  const descriptionResponse = await api.dataCatalogControllerCreateDescription({
    body: {
      name: descriptionForm.value.name.trim(),
      description: descriptionForm.value.description || undefined,
      officialUrl: descriptionForm.value.officialUrl || undefined,
      familyId,
      tagIds: descriptionTags.value.map((tag) => tag.id),
      applicationSourceIds: descriptionApplicationsSource.value.map((app) => app.id),
    },
  });
  if (!descriptionResponse.response.ok || !descriptionResponse.data) throw new Error("description creation failed");
  return descriptionResponse.data.id;
}

// Édition : met à jour les informations propres à la donnée liée (nom, famille, tags, applications
// source), en plus des champs d'usage applicatif gérés par ailleurs.
async function updateDescriptionFields(dataDescriptionId: string): Promise<void> {
  const familyId = await resolveFamilyId();
  const response = await api.dataCatalogControllerUpdateDescription({
    path: { id: dataDescriptionId },
    body: {
      name: descriptionForm.value.name.trim(),
      description: descriptionForm.value.description || undefined,
      officialUrl: descriptionForm.value.officialUrl || undefined,
      familyId,
      tagIds: descriptionTags.value.map((tag) => tag.id),
      applicationSourceIds: descriptionApplicationsSource.value.map((app) => app.id),
    },
  });
  if (!response.response.ok) throw new Error("description update failed");
}

async function handleSubmit() {
  if (props.initialItem || isCreatingNewDescription.value) {
    newDescriptionError.value = isDescriptionFieldsValid.value
      ? undefined
      : "Veuillez renseigner un nom (et une famille si « nouvelle » est choisie).";
    if (newDescriptionError.value) return;
  } else {
    descriptionError.value = isFormValid.value ? undefined : "Veuillez sélectionner une donnée existante dans la liste.";
    if (descriptionError.value) return;
  }

  isSubmitting.value = true;
  try {
    const dataDescriptionId = props.initialItem ? form.value.dataDescriptionId : await resolveDataDescriptionId();
    if (props.initialItem) {
      await updateDescriptionFields(dataDescriptionId);
    }
    const body: CreateDataApplicationDto = {
      dataDescriptionId,
      sensibilityId: form.value.sensibilityId || undefined,
      example: form.value.example || undefined,
      openDataStatus: (form.value.openDataStatus || undefined) as OpenDataStatus | undefined,
      isReference: form.value.isReference,
      businessUsage: form.value.businessUsage || undefined,
      documentationUrl: form.value.documentationUrl
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean),
      volumetry: toNumberOrUndefined(form.value.volumetry),
      monthlyVolumetry: toNumberOrUndefined(form.value.monthlyVolumetry),
      updateFrequency: (form.value.updateFrequency || undefined) as UpdateFrequency | undefined,
      conservation: form.value.conservation || undefined,
    };

    if (props.initialItem) {
      const response = await api.dataCatalogControllerUpdateApplicationData({
        path: { applicationId: props.applicationId, dataApplicationId: props.initialItem.id },
        body,
      });
      if (!response.response.ok) throw new Error("update failed");
      toaster.addSuccessMessage("Donnée mise à jour avec succès");
      emit("dataUpdated");
    } else {
      const response = await api.dataCatalogControllerCreateApplicationData({
        path: { applicationId: props.applicationId },
        body,
      });
      if (!response.response.ok) throw new Error("create failed");
      toaster.addSuccessMessage(
        isCreatingNewDescription.value
          ? "Nouvelle donnée créée et rattachée à l'application avec succès"
          : "Donnée rattachée à l'application avec succès",
      );
      emit("dataCreated");
    }
    emit("close");
  } catch (error) {
    console.error("Error submitting data application form:", error);
    toaster.addErrorMessage("Une erreur est survenue lors de l'enregistrement de la donnée.");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DsfrModal
    :opened="true"
    :title="props.initialItem ? 'Modifier une donnée' : 'Rattacher une donnée'"
    data-testid="data-application-modal"
    @close="$emit('close')"
  >
    <DsfrAlert
      v-show="props.initialItem && props.errorMessage.length > 0"
      class="mb-4"
      tabindex="-1"
      type="error"
      role="alert"
      aria-live="assertive"
      title="Une erreur est survenue"
      :description="props.errorMessage"
    />
    <form data-testid="data-application-form" @submit.prevent="handleSubmit">
      <p class="fr-text--sm fr-mb-2w" data-testid="required-fields-hint">Tous les champs avec un * sont obligatoires</p>

      <div v-if="isLoadingOptions" class="fr-text--center fr-mb-2w" data-testid="data-application-options-loading">
        <span class="fr-loading fr-loading--sm" data-testid="data-application-options-spinner">
          <span class="fr-loading__icon" aria-hidden="true" />
        </span>
        Chargement des options...
      </div>
      <div v-else class="fr-form-group">
        <template v-if="!isCreatingNewDescription">
          <DsfrInputGroup
            v-model="descriptionSearch"
            label-visible
            label="Donnée d'application"
            hint="Commencez à taper pour rechercher une donnée existante"
            list="dataDescriptionsList"
            required
            :disabled="!!props.initialItem"
            class="fr-mb-1w"
            :error-message="descriptionError"
            data-testid="data-description-search-input"
          />
          <datalist id="dataDescriptionsList" data-testid="data-descriptions-list">
            <option
              v-for="description in descriptionsList"
              :key="description.id"
              :data-testid="`data-description-option-${description.id}`"
            >
              {{ formatDescriptionText(description) }}
            </option>
          </datalist>

          <p v-if="!props.initialItem" class="fr-mb-3w">
            <DsfrButton
              tertiary
              no-outline
              size="sm"
              label="Vous ne trouvez pas la donnée ? Créer une nouvelle donnée d'application"
              data-testid="data-application-create-description-toggle"
              @click="toggleCreateNewDescription(true)"
            />
          </p>
        </template>

        <!-- Informations propres à la donnée d'application : à la création d'une nouvelle donnée,
             ou en édition de celle déjà liée (identité verrouillée ci-dessus, mais ses propres
             informations restent modifiables ici). -->
        <template v-if="isCreatingNewDescription || props.initialItem">
          <div class="fr-mb-3w new-description-panel">
            <div class="fr-grid-row fr-grid-row--middle fr-mb-2w">
              <div class="fr-col">
                <p class="fr-text--bold fr-mb-0">
                  {{ props.initialItem ? "Informations de la donnée d'application" : "Nouvelle donnée d'application" }}
                </p>
              </div>
              <div v-if="!props.initialItem" class="fr-col-auto">
                <DsfrButton
                  tertiary
                  no-outline
                  size="sm"
                  label="Revenir à la recherche"
                  data-testid="data-application-cancel-new-description"
                  @click="toggleCreateNewDescription(false)"
                />
              </div>
            </div>

            <DsfrInput
              v-model="descriptionForm.name"
              label="Nom de la donnée"
              label-visible
              required
              class="fr-mb-3w"
              :error-message="newDescriptionError"
              data-testid="new-description-name-input"
            />

            <DsfrInput
              v-model="descriptionForm.description"
              label="Description"
              label-visible
              is-textarea
              class="fr-mb-3w"
              data-testid="new-description-description-input"
            />

            <DsfrInput
              v-model="descriptionForm.officialUrl"
              label="URL officielle"
              label-visible
              class="fr-mb-3w"
              data-testid="new-description-official-url-input"
            />

            <DsfrSelect
              v-model="descriptionForm.familyId"
              label="Famille métier"
              label-visible
              class="fr-mb-3w"
              data-testid="new-description-family-select"
              :options="[
                { value: '', text: 'Non renseignée' },
                ...familiesList.map((family) => ({ value: family.id, text: family.path })),
                { value: NEW_FAMILY_VALUE, text: '+ Créer une nouvelle famille' },
              ]"
            />

            <DsfrInput
              v-if="descriptionForm.familyId === NEW_FAMILY_VALUE"
              v-model="newFamilyPath"
              label="Chemin de la nouvelle famille"
              label-visible
              required
              hint="Ex : Identité / Etat civil"
              class="fr-mb-3w"
              data-testid="new-family-path-input"
            />

            <fieldset class="tags-fieldset fr-mb-3w">
              <legend class="fr-label">Applications source</legend>
              <ul v-if="descriptionApplicationsSource.length" class="fr-tags-group" data-testid="new-description-applications-source">
                <li v-for="(application, index) in descriptionApplicationsSource" :key="application.id" class="fr-mr-1v fr-mb-1v">
                  <DsfrTag
                    :label="application.label"
                    tag-name="button"
                    class="fr-tag--dismiss"
                    :aria-label="`Retirer l'application source : ${application.label}`"
                    @click.stop.prevent="removeDescriptionApplicationSource(index)"
                  />
                </li>
              </ul>
              <label for="new-description-application-source-search" class="fr-sr-only">
                Rechercher une application source à ajouter
              </label>
              <AccessibleAutocomplete
                id="new-description-application-source-search"
                data-testid="new-description-application-source-search"
                title="Rechercher une application source à ajouter"
                list-label="Applications proposées"
                :search="searchApplicationsSource"
                placeholder="Rechercher une application"
                :on-change="addDescriptionApplicationSource"
                :display-no-result="true"
                :display-label="(item) => item?.label ?? ''"
              />
            </fieldset>

            <fieldset class="tags-fieldset">
              <legend class="fr-label">Tags</legend>
              <ul v-if="descriptionTags.length" class="fr-tags-group" data-testid="new-description-tags">
                <li v-for="(tag, index) in descriptionTags" :key="tag.id" class="fr-mr-1v fr-mb-1v">
                  <DsfrTag
                    :label="tag.name"
                    tag-name="button"
                    class="fr-tag--dismiss"
                    :aria-label="`Retirer le tag : ${tag.name}`"
                    @click.stop.prevent="removeDescriptionTag(index)"
                  />
                </li>
              </ul>
              <label for="new-description-tag-search" class="fr-sr-only">Rechercher un tag à ajouter</label>
              <AccessibleAutocomplete
                id="new-description-tag-search"
                data-testid="new-description-tag-search"
                title="Rechercher un tag à ajouter"
                list-label="Tags proposés"
                :search="searchTags"
                placeholder="Rechercher un tag"
                :on-change="addDescriptionTag"
                :display-no-result="true"
                :display-label="(item) => item?.name ?? ''"
              />
            </fieldset>
          </div>
        </template>

        <DsfrSelect
          v-model="form.sensibilityId"
          label="Sensibilité"
          label-visible
          class="fr-mb-3w"
          data-testid="data-application-sensibility-select"
          :options="[
            { value: '', text: 'Non renseignée' },
            ...sensibilitiesList.map((sensibility) => ({ value: sensibility.id, text: sensibility.label })),
          ]"
        />

        <DsfrSelect
          v-model="form.openDataStatus"
          label="Statut open data"
          label-visible
          class="fr-mb-3w"
          data-testid="data-application-open-data-select"
          :options="[
            { value: '', text: 'Non renseigné' },
            ...Object.values(OpenDataStatus).map((status) => ({ value: status, text: OPEN_DATA_STATUS_LABELS[status] })),
          ]"
        />

        <DsfrSelect
          v-model="form.updateFrequency"
          label="Fréquence de mise à jour"
          label-visible
          class="fr-mb-3w"
          data-testid="data-application-update-frequency-select"
          :options="[
            { value: '', text: 'Non renseignée' },
            ...Object.values(UpdateFrequency).map((frequency) => ({ value: frequency, text: UPDATE_FREQUENCY_LABELS[frequency] })),
          ]"
        />

        <DsfrCheckbox
          v-model="form.isReference"
          label="Donnée de référence (source de vérité)"
          name="isReference"
          :value="true"
          class="fr-mb-3w"
          data-testid="data-application-is-reference-checkbox"
        />

        <DsfrInput
          v-model="form.businessUsage"
          label="Usage métier"
          label-visible
          is-textarea
          class="fr-mb-3w"
          data-testid="data-application-business-usage-input"
        />

        <DsfrInput
          v-model="form.example"
          label="Exemple de valeur"
          label-visible
          is-textarea
          class="fr-mb-3w"
          data-testid="data-application-example-input"
        />

        <DsfrInput
          v-model="form.conservation"
          label="Durée de conservation"
          label-visible
          class="fr-mb-3w"
          data-testid="data-application-conservation-input"
        />

        <div class="fr-grid-row fr-grid-row--gutters fr-mb-3w">
          <div class="fr-col-6">
            <DsfrInput
              v-model="form.volumetry"
              type="number"
              min="0"
              label="Volumétrie totale"
              label-visible
              data-testid="data-application-volumetry-input"
            />
          </div>
          <div class="fr-col-6">
            <DsfrInput
              v-model="form.monthlyVolumetry"
              type="number"
              min="0"
              label="Volumétrie mensuelle"
              label-visible
              data-testid="data-application-monthly-volumetry-input"
            />
          </div>
        </div>

        <DsfrInput
          v-model="form.documentationUrl"
          label="Liens de documentation"
          label-visible
          is-textarea
          hint="Une URL par ligne"
          class="fr-mb-3w"
          data-testid="data-application-documentation-input"
        />
      </div>
      <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
        <DsfrButton type="button" secondary label="Annuler" data-testid="data-application-cancel-btn" @click="$emit('close')" />
        <DsfrButton
          type="submit"
          :disabled="isSubmitting || isLoadingOptions"
          :label="props.initialItem ? 'Modifier' : 'Rattacher'"
          data-testid="data-application-submit-btn"
        >
          <template v-if="isSubmitting">
            <span class="fr-loading fr-loading--sm" data-testid="data-application-submit-loading">
              <span class="fr-loading__icon" aria-hidden="true" />
            </span>
          </template>
        </DsfrButton>
      </div>
    </form>
  </DsfrModal>
</template>

<style scoped>
.new-description-panel {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
}

.tags-fieldset {
  border: none;
  margin: 0;
  padding: 0;
}
</style>
