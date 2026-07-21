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
const descriptionForm = ref({ name: "", description: "", officialUrl: "" });
const newDescriptionError = ref<string | undefined>(undefined);
const descriptionTags = ref<TagDto[]>([]);
const descriptionApplicationsSource = ref<ApplicationRefDto[]>([]);
const descriptionFamilies = ref<DataFamilyDto[]>([]);
const isCreatingNewFamily = ref(false);
const newFamilyPath = ref("");
const newFamilyError = ref<string | undefined>(undefined);

function resetDescriptionFormFields() {
  descriptionForm.value = { name: "", description: "", officialUrl: "" };
  newDescriptionError.value = undefined;
  descriptionTags.value = [];
  descriptionApplicationsSource.value = [];
  descriptionFamilies.value = [];
  isCreatingNewFamily.value = false;
  newFamilyPath.value = "";
  newFamilyError.value = undefined;
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

async function searchFamilies(query: string): Promise<DataFamilyDto[]> {
  const normalizedQuery = query.trim().toLowerCase();
  return familiesList.value.filter(
    (family) =>
      family.path.toLowerCase().includes(normalizedQuery) && !descriptionFamilies.value.some((selected) => selected.id === family.id),
  );
}

function addDescriptionFamily(family: DataFamilyDto | null) {
  if (family && !descriptionFamilies.value.some((f) => f.id === family.id)) {
    descriptionFamilies.value = [...descriptionFamilies.value, family];
  }
}

function removeDescriptionFamily(index: number) {
  descriptionFamilies.value = descriptionFamilies.value.filter((_, i) => i !== index);
}

function toggleCreateNewFamily(value: boolean) {
  isCreatingNewFamily.value = value;
  newFamilyPath.value = "";
  newFamilyError.value = undefined;
}

async function createAndAddFamily() {
  if (!newFamilyPath.value.trim()) {
    newFamilyError.value = "Veuillez renseigner un chemin de famille.";
    return;
  }
  try {
    const response = await api.dataFamilyControllerCreate({ body: { path: newFamilyPath.value.trim() } });
    if (!response.response.ok || !response.data) throw new Error("family creation failed");
    familiesList.value = [...familiesList.value, response.data];
    addDescriptionFamily(response.data);
    toggleCreateNewFamily(false);
  } catch (error) {
    console.error("Error creating family:", error);
    newFamilyError.value = "Erreur lors de la création de la famille.";
  }
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
  const familiesPath = (description.families ?? []).map((family) => family.path).join(", ");
  return familiesPath ? `${description.name} (${familiesPath})` : description.name;
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

// Valide le panneau d'informations de la donnée (nom uniquement) — utilisé aussi bien à la création
// d'une nouvelle donnée qu'à l'édition de celle déjà liée.
const isDescriptionFieldsValid = computed(() => !!descriptionForm.value.name.trim());

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
    };
    newDescriptionError.value = undefined;
    descriptionTags.value = item.dataDescription.tags ?? [];
    descriptionApplicationsSource.value = item.dataDescription.applicationsSource ?? [];
    descriptionFamilies.value = item.dataDescription.families ?? [];
    isCreatingNewFamily.value = false;
    newFamilyPath.value = "";
    newFamilyError.value = undefined;
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

async function resolveDataDescriptionId(): Promise<string> {
  if (!isCreatingNewDescription.value) {
    return matchedExistingDescription.value?.id ?? "";
  }

  const descriptionResponse = await api.dataCatalogControllerCreateDescription({
    body: {
      name: descriptionForm.value.name.trim(),
      description: descriptionForm.value.description || undefined,
      officialUrl: descriptionForm.value.officialUrl || undefined,
      familyIds: descriptionFamilies.value.map((family) => family.id),
      tagIds: descriptionTags.value.map((tag) => tag.id),
      applicationSourceIds: descriptionApplicationsSource.value.map((app) => app.id),
    },
  });
  if (!descriptionResponse.response.ok || !descriptionResponse.data) throw new Error("description creation failed");
  return descriptionResponse.data.id;
}

// Édition : met à jour les informations propres à la donnée liée (nom, familles, tags, applications
// source), en plus des champs d'usage applicatif gérés par ailleurs.
async function updateDescriptionFields(dataDescriptionId: string): Promise<void> {
  const response = await api.dataCatalogControllerUpdateDescription({
    path: { id: dataDescriptionId },
    body: {
      name: descriptionForm.value.name.trim(),
      description: descriptionForm.value.description || undefined,
      officialUrl: descriptionForm.value.officialUrl || undefined,
      familyIds: descriptionFamilies.value.map((family) => family.id),
      tagIds: descriptionTags.value.map((tag) => tag.id),
      applicationSourceIds: descriptionApplicationsSource.value.map((app) => app.id),
    },
  });
  if (!response.response.ok) throw new Error("description update failed");
}

async function handleSubmit() {
  if (props.initialItem || isCreatingNewDescription.value) {
    newDescriptionError.value = isDescriptionFieldsValid.value ? undefined : "Veuillez renseigner un nom.";
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
            hint="Commencez à taper pour rechercher une donnée existante"
            aria-describedby="data-description-search-tooltip-desc"
            list="dataDescriptionsList"
            required
            :disabled="!!props.initialItem"
            class="fr-mb-1w"
            :error-message="descriptionError"
            data-testid="data-description-search-input"
          >
            <template #label>
              <span class="tooltip-label">
                Donnée d'application
                <DsfrTooltip
                  id="data-description-search-tooltip-desc"
                  content="Recherchez une donnée déjà existante dans le catalogue pour la rattacher à cette application. Si elle n'existe pas encore, utilisez le lien ci-dessous pour la créer."
                />
              </span>
            </template>
          </DsfrInputGroup>
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
              label-visible
              required
              aria-describedby="new-description-name-tooltip-desc"
              class="fr-mb-3w"
              :error-message="newDescriptionError"
              data-testid="new-description-name-input"
            >
              <template #label>
                <span class="tooltip-label">
                  Nom de la donnée
                  <DsfrTooltip
                    id="new-description-name-tooltip-desc"
                    content="Nom de la donnée du catalogue, visible par toutes les applications qui la réutilisent."
                  />
                </span>
              </template>
            </DsfrInput>

            <DsfrInput
              v-model="descriptionForm.description"
              label-visible
              is-textarea
              aria-describedby="new-description-description-tooltip-desc"
              class="fr-mb-3w"
              data-testid="new-description-description-input"
            >
              <template #label>
                <span class="tooltip-label">
                  Description
                  <DsfrTooltip
                    id="new-description-description-tooltip-desc"
                    content="Description détaillée de la donnée, utile aux autres équipes qui envisagent de la réutiliser."
                  />
                </span>
              </template>
            </DsfrInput>

            <DsfrInput
              v-model="descriptionForm.officialUrl"
              label-visible
              aria-describedby="new-description-official-url-tooltip-desc"
              class="fr-mb-3w"
              data-testid="new-description-official-url-input"
            >
              <template #label>
                <span class="tooltip-label">
                  URL officielle
                  <DsfrTooltip
                    id="new-description-official-url-tooltip-desc"
                    content="Lien vers la source officielle faisant référence pour cette donnée (ex : référentiel externe, documentation métier)."
                  />
                </span>
              </template>
            </DsfrInput>

            <fieldset class="tags-fieldset fr-mb-3w">
              <legend class="fr-label">
                <span class="tooltip-label">
                  Familles métier
                  <DsfrTooltip
                    id="new-description-families-tooltip-desc"
                    content="Regroupement thématique de la donnée. Une donnée peut appartenir à plusieurs familles."
                  />
                </span>
              </legend>
              <ul v-if="descriptionFamilies.length" class="fr-tags-group" data-testid="new-description-families">
                <li v-for="(family, index) in descriptionFamilies" :key="family.id" class="fr-mr-1v fr-mb-1v">
                  <DsfrTag
                    :label="family.path"
                    tag-name="button"
                    class="fr-tag--dismiss"
                    :aria-label="`Retirer la famille : ${family.path}`"
                    @click.stop.prevent="removeDescriptionFamily(index)"
                  />
                </li>
              </ul>
              <label for="new-description-family-search" class="fr-sr-only">Rechercher une famille à ajouter</label>
              <AccessibleAutocomplete
                id="new-description-family-search"
                data-testid="new-description-family-search"
                title="Rechercher une famille à ajouter"
                list-label="Familles proposées"
                :search="searchFamilies"
                placeholder="Rechercher une famille"
                :on-change="addDescriptionFamily"
                :display-no-result="true"
                :display-label="(item) => item?.path ?? ''"
              />

              <p v-if="!isCreatingNewFamily" class="fr-mt-1w fr-mb-0">
                <DsfrButton
                  tertiary
                  no-outline
                  size="sm"
                  label="+ Créer une nouvelle famille"
                  data-testid="new-description-create-family-toggle"
                  @click="toggleCreateNewFamily(true)"
                />
              </p>
              <div v-else class="fr-grid-row fr-grid-row--bottom fr-grid-row--gutters fr-mt-1w">
                <div class="fr-col">
                  <DsfrInput
                    v-model="newFamilyPath"
                    label="Chemin de la nouvelle famille"
                    label-visible
                    hint="Ex : Identité / Etat civil"
                    :error-message="newFamilyError"
                    data-testid="new-family-path-input"
                  />
                </div>
                <div class="fr-col-auto">
                  <DsfrButton
                    type="button"
                    secondary
                    size="sm"
                    label="Annuler"
                    data-testid="new-family-cancel-btn"
                    @click="toggleCreateNewFamily(false)"
                  />
                </div>
                <div class="fr-col-auto">
                  <DsfrButton type="button" size="sm" label="Ajouter" data-testid="new-family-add-btn" @click="createAndAddFamily" />
                </div>
              </div>
            </fieldset>

            <fieldset class="tags-fieldset fr-mb-3w">
              <legend class="fr-label">
                <span class="tooltip-label">
                  Applications source
                  <DsfrTooltip
                    id="new-description-applications-source-tooltip-desc"
                    content="Applications RefApp qui produisent ou possèdent cette donnée à l'origine."
                  />
                </span>
              </legend>
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
              <legend class="fr-label">
                <span class="tooltip-label">
                  Tags
                  <DsfrTooltip
                    id="new-description-tags-tooltip-desc"
                    content="Mots-clés libres facilitant la recherche et le filtrage de cette donnée dans le catalogue."
                  />
                </span>
              </legend>
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
          label-visible
          aria-describedby="data-application-sensibility-tooltip-desc"
          class="fr-mb-3w"
          data-testid="data-application-sensibility-select"
          :options="[
            { value: '', text: 'Non renseignée' },
            ...sensibilitiesList.map((sensibility) => ({ value: sensibility.id, text: sensibility.label })),
          ]"
        >
          <template #label>
            <span class="tooltip-label">
              Sensibilité
              <DsfrTooltip
                id="data-application-sensibility-tooltip-desc"
                content="Niveau de sensibilité de la donnée dans le contexte de cette application (ex : RGPD, donnée sensible)."
              />
            </span>
          </template>
        </DsfrSelect>

        <DsfrSelect
          v-model="form.openDataStatus"
          label-visible
          aria-describedby="data-application-open-data-tooltip-desc"
          class="fr-mb-3w"
          data-testid="data-application-open-data-select"
          :options="[
            { value: '', text: 'Non renseigné' },
            ...Object.values(OpenDataStatus).map((status) => ({ value: status, text: OPEN_DATA_STATUS_LABELS[status] })),
          ]"
        >
          <template #label>
            <span class="tooltip-label">
              Statut open data
              <DsfrTooltip
                id="data-application-open-data-tooltip-desc"
                content="Indique si cette donnée est exposée, exposable ou non exposable en open data."
              />
            </span>
          </template>
        </DsfrSelect>

        <DsfrSelect
          v-model="form.updateFrequency"
          label-visible
          aria-describedby="data-application-update-frequency-tooltip-desc"
          class="fr-mb-3w"
          data-testid="data-application-update-frequency-select"
          :options="[
            { value: '', text: 'Non renseignée' },
            ...Object.values(UpdateFrequency).map((frequency) => ({ value: frequency, text: UPDATE_FREQUENCY_LABELS[frequency] })),
          ]"
        >
          <template #label>
            <span class="tooltip-label">
              Fréquence de mise à jour
              <DsfrTooltip
                id="data-application-update-frequency-tooltip-desc"
                content="Fréquence à laquelle la donnée est mise à jour dans cette application."
              />
            </span>
          </template>
        </DsfrSelect>

        <DsfrCheckbox
          v-model="form.isReference"
          name="isReference"
          :value="true"
          class="fr-mb-3w"
          data-testid="data-application-is-reference-checkbox"
        >
          <template #label>
            <span class="tooltip-label">
              Donnée de référence (source de vérité)
              <DsfrTooltip
                id="data-application-is-reference-tooltip-desc"
                content="À cocher si cette application est la source de vérité pour cette donnée (le référentiel faisant autorité)."
              />
            </span>
          </template>
        </DsfrCheckbox>

        <DsfrInput
          v-model="form.businessUsage"
          label-visible
          is-textarea
          aria-describedby="data-application-business-usage-tooltip-desc"
          class="fr-mb-3w"
          data-testid="data-application-business-usage-input"
        >
          <template #label>
            <span class="tooltip-label">
              Usage métier
              <DsfrTooltip
                id="data-application-business-usage-tooltip-desc"
                content="Description de l'usage métier fait de cette donnée dans cette application."
              />
            </span>
          </template>
        </DsfrInput>

        <DsfrInput
          v-model="form.example"
          label-visible
          is-textarea
          aria-describedby="data-application-example-tooltip-desc"
          class="fr-mb-3w"
          data-testid="data-application-example-input"
        >
          <template #label>
            <span class="tooltip-label">
              Exemple de valeur
              <DsfrTooltip
                id="data-application-example-tooltip-desc"
                content="Exemple concret de contenu de la donnée, pour aider à sa compréhension."
              />
            </span>
          </template>
        </DsfrInput>

        <DsfrInput
          v-model="form.conservation"
          label-visible
          aria-describedby="data-application-conservation-tooltip-desc"
          class="fr-mb-3w"
          data-testid="data-application-conservation-input"
        >
          <template #label>
            <span class="tooltip-label">
              Durée de conservation
              <DsfrTooltip
                id="data-application-conservation-tooltip-desc"
                content="Durée pendant laquelle la donnée est conservée dans cette application."
              />
            </span>
          </template>
        </DsfrInput>

        <div class="fr-grid-row fr-grid-row--gutters fr-mb-3w">
          <div class="fr-col-6">
            <DsfrInput
              v-model="form.volumetry"
              type="number"
              min="0"
              label-visible
              aria-describedby="data-application-volumetry-tooltip-desc"
              data-testid="data-application-volumetry-input"
            >
              <template #label>
                <span class="tooltip-label">
                  Volumétrie totale
                  <DsfrTooltip
                    id="data-application-volumetry-tooltip-desc"
                    content="Nombre total estimé d'enregistrements de cette donnée."
                  />
                </span>
              </template>
            </DsfrInput>
          </div>
          <div class="fr-col-6">
            <DsfrInput
              v-model="form.monthlyVolumetry"
              type="number"
              min="0"
              label-visible
              aria-describedby="data-application-monthly-volumetry-tooltip-desc"
              data-testid="data-application-monthly-volumetry-input"
            >
              <template #label>
                <span class="tooltip-label">
                  Volumétrie mensuelle
                  <DsfrTooltip
                    id="data-application-monthly-volumetry-tooltip-desc"
                    content="Nombre d'enregistrements ajoutés en moyenne chaque mois."
                  />
                </span>
              </template>
            </DsfrInput>
          </div>
        </div>

        <DsfrInput
          v-model="form.documentationUrl"
          label-visible
          is-textarea
          hint="Une URL par ligne"
          aria-describedby="data-application-documentation-tooltip-desc"
          class="fr-mb-3w"
          data-testid="data-application-documentation-input"
        >
          <template #label>
            <span class="tooltip-label">
              Liens de documentation
              <DsfrTooltip
                id="data-application-documentation-tooltip-desc"
                content="URLs de documentation technique ou fonctionnelle associées à cette donnée, une par ligne."
              />
            </span>
          </template>
        </DsfrInput>
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
/* `DsfrTooltip` positionne sa bulle via un `transform` calculé en JS par rapport à la largeur de LA
   FENÊTRE entière, pas de la modale (plus étroite et centrée) : la bulle peut rester « dans l'écran »
   selon son propre calcul tout en débordant largement de la modale (bug constaté, y compris après
   un simple passage en `position: absolute`). On ignore complètement ce calcul et on ancre la bulle
   nous-mêmes, juste en dessous de son champ, avec une largeur volontairement réduite : garanti de
   tenir dans la modale quelle que soit la position du champ. */
.tooltip-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  position: relative;
}

:deep(.fr-tooltip) {
  position: absolute !important;
  top: 100% !important;
  left: 0 !important;
  transform: none !important;
  margin-top: 0.25rem;
  max-width: 220px;
}

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
