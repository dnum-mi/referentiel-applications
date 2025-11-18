<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToasterStore } from "@/stores/toasterStore";
import { useApplicationStore } from "@/stores/applicationStore";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import TagSearchSelect from "@/components/common/TagSearchSelect.vue";
import { statusApplicationDictionary, priorityRestartLabelsOptions } from "@/composables/use-dictionary";
import api from "@/api/index";
import type {
  ApplicationDto,
  ApplicationStatus,
  CreateApplicationDto,
  LabelDto,
} from "@/client/types.gen";
import type { ApplicationWithPerms } from "@/models/Application";

interface Props {
  mode?: "create" | "edit"
  initialData: ApplicationWithPerms
  labels?: LabelDto[]
}

const props = withDefaults(defineProps<Props>(), {
  mode: "create",
  labels: () => [],
});

const emit = defineEmits<{
  success: [application: ApplicationDto]
  cancel: []
}>();

const toaster = useToasterStore();
const applicationStore = useApplicationStore();
const router = useRouter();
const isSubmitting = ref(false);
const labelError = ref<string | undefined>(undefined);
const descriptionError = ref<string | undefined>(undefined);
const globalError = ref<string | undefined>(undefined);
const initialLabels = ref<LabelDto[]>([]);

const isCreateMode = computed(() => props.mode === "create");
const canEditBase = computed(() => isCreateMode.value || props.initialData?.myPerms.has("writeBase"));
const canEditPriorityRestart = computed(() => isCreateMode.value || props.initialData?.myPerms.has("writePriorityRestart"));

const filterEmpty = (arr: string[] | undefined) => arr?.filter(item => item.trim() !== "") ?? [];

const statusOptions = computed(() =>
  Object.entries(statusApplicationDictionary).map(([value, text]) => ({
    value: value as ApplicationStatus,
    text,
  })),
);

const form = ref<CreateApplicationDto>(props.initialData ?? {
  label: "",
  shortName: "",
  description: "",
  logo: "",
  status: { status: "IN_PROGRESS" },
  purposes: [],
  targetPopulations: [],
  priorityRestart: null,
  tags: [],
  labels: [],
});

async function handleSubmit() {
  labelError.value = undefined;
  descriptionError.value = undefined;
  globalError.value = undefined;
  let hasError = false;

  if (form.value.label === "") {
    labelError.value = "Le nom de l'application est obligatoire.";
    hasError = true;
  }
  if (form.value.description === "") {
    descriptionError.value = "La description est obligatoire.";
    hasError = true;
  }

  if (hasError) {
    return;
  }

  isSubmitting.value = true;

  // Filter out empty purposes and target populations
  form.value.purposes = filterEmpty(form.value.purposes);
  form.value.targetPopulations = filterEmpty(form.value.targetPopulations);

  try {
    if (isCreateMode.value) {
      await handleCreate();
    } else {
      await handleUpdate();
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function handleCreate() {
  try {
    const response = await api.applicationControllerCreate({ body: form.value});

    if (!response.response.ok || !response.data) {
      throw response.error;
    }

    const application = response.data as ApplicationDto;

    toaster.addSuccessMessage("Application créée avec succès !");
    emit("success", application);
    router.push({ name: "application", params: { id: application.id } });
  } catch (error) {
    globalError.value = error.message.join(", ");
  }
}

async function handleUpdate() {
  const deletedLabels = initialLabels.value.filter(initial => !form.value.labels.some(label => label.id === initial.id));
  const newLabels = form.value.labels.filter(label => !initialLabels.value.some(initial => initial.id === label.id));
  const updatedLabels = form.value.labels.filter((label) => {
    const initial = initialLabels.value.find(i => i.id === label.id);
    return initial && (initial.value !== label.value || initial.source !== label.source);
  });

  try {
    // Handle labels updates
    for (const label of deletedLabels) {
      if (label.id) {
        await api.labelsControllerDelete({
          path: { applicationId: props.initialData.id, id: label.id },
        });
      }
    }

    for (const label of newLabels) {
      await api.labelsControllerCreate({
        path: { applicationId: props.initialData.id },
        body: { source: label.source, value: label.value },
      });
    }

    for (const label of updatedLabels) {
      if (label.id) {
        await api.labelsControllerUpdate({
          path: { applicationId: props.initialData.id, id: label.id },
          body: { source: label.source, value: label.value },
        });
      }
    }

    const updatedApp = await applicationStore.patchApplication(form.value);
    applicationStore.applicationsById[props.initialData.id] = updatedApp;

    toaster.addSuccessMessage("Application mise à jour avec succès !");
    emit("success", props.initialData as ApplicationDto);
  } catch (error) {
    globalError.value = error.message.join(", ");
  }
}

function addPurpose() {
  form.value.purposes.push("");
}

function removePurpose(index: number) {
  form.value.purposes.splice(index, 1);
}

function addPopulation() {
  form.value.targetPopulations.push("");
}

function removePopulation(index: number) {
  form.value.targetPopulations.splice(index, 1);
}

onMounted(() => {
  initialLabels.value = props.labels ? JSON.parse(JSON.stringify(props.labels)) : [];
});
</script>

<template>
  <DsfrAlert
    v-if="globalError"
    :description="globalError"
    type="error"
    class="fr-mb-3w"
    closeable
    @close="globalError = undefined"
  />
  <form data-testid="application-form" @submit.prevent="handleSubmit">
    <DsfrInputGroup
      v-model.trim="form.label"
      :disabled="!canEditBase"
      hint="Doit contenir au moins une lettre.
Seuls les lettres (avec accents), chiffres, espaces, points et tirets sont autorisés.
Aucun espace en début ou en fin."
      label="Nom de l'application"
      label-visible
      required
      :error-message="labelError"
      data-testid="application-label"
    />

    <DsfrInputGroup
      v-model.trim="form.shortName"
      :disabled="!canEditBase"
      class="fr-mt-3w"
      label="Nom court"
      label-visible
      hint="Optionnel - Un nom court pour identifier rapidement l'application"
      data-testid="application-shortname"
    />

    <DsfrSelect
      v-if="isCreateMode"
      v-model="form.status.status"
      :options="statusOptions"
      label="Status de l'application"
      default-unselected-text="Sélectionner un status"
      data-testid="application-status"
    />

    <div v-if="!isCreateMode" class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Noms alternatifs
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(_label, index) in form.labels" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput
              :model-value="form.labels[index].source ?? ''"
              :disabled="!canEditBase"
              :placeholder="`Reférentiel externe ${index + 1} (optionnel)`"
              :data-testid="`application-alt-label-source-${index}`"
              @update:model-value="form.labels[index].source = (typeof $event === 'string' ? $event : null) || null"
            />
            <DsfrInput
              v-model.trim="form.labels[index].value"
              :disabled="!canEditBase"
              :placeholder="`Nom ou identifiant externe ${index + 1}`"
              :data-testid="`application-alt-label-value-${index}`"
            />
          </div>
          <div class="fr-col-auto">
            <DsfrButton
              :disabled="!canEditBase"
              type="button"
              tertiary
              size="sm"
              icon="delete-line"
              label="Supprimer"
              title="Supprimer ce libellé alternatif"
              aria-label="Supprimer ce libellé alternatif"
              :data-testid="`application-alt-label-remove-${index}`"
              @click="form.labels.splice(index, 1)"
            />
          </div>
        </div>
        <DsfrButton
          :disabled="!canEditBase"
          type="button"
          secondary
          icon="add-line"
          label="Ajouter un libellé"
          title="Ajouter un nouveau libellé alternatif"
          aria-label="Ajouter un nouveau libellé alternatif"
          data-testid="application-alt-label-add"
          @click="form.labels.push({ source: '', value: '' })"
        />
      </div>
    </div>

    <DsfrInputGroup class="fr-mt-3w" label="Description" label-visible required :error-message="descriptionError">
      <MarkdownEditor v-model.trim="form.description" :disabled="!canEditBase" data-testid="application-description" />
    </DsfrInputGroup>

    <DsfrSelect
      v-model="form.priorityRestart"
      :disabled="!canEditPriorityRestart"
      :options="priorityRestartLabelsOptions"
      label="Priorité de redémarrage"
      default-unselected-text="Sélectionner une priorité"
      data-testid="application-priority-restart"
    />

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Population
      </legend>
      <p class="fr-hint-text">
        Indiquez ici le public cible concerné (ex. : RH, agents publics, entreprises...)
      </p>
      <div class="fr-mt-2w">
        <div v-for="(_targetPopulation, index) in form.targetPopulations" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model.trim="form.targetPopulations[index]" :disabled="!canEditBase" :data-testid="`application-population-${index}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" title="Supprimer cette population" aria-label="Supprimer cette population" :disabled="!canEditBase" :data-testid="`application-population-remove-${index}`" @click="removePopulation(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter une population" title="Ajouter une nouvelle population" aria-label="Ajouter une population" :disabled="!canEditBase" data-testid="application-population-add" @click="addPopulation" />
      </div>
    </div>

    <DsfrInputGroup
      v-if="!isCreateMode"
      v-model.trim="form.logo"
      :disabled="!canEditBase"
      class="fr-mt-3w"
      label="URL du logo"
      label-visible
      hint="Optionnel - URL d'une image représentant l'application"
      data-testid="application-logo"
    />

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Objectifs
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(_purpose, index) in form.purposes" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model.trim="form.purposes[index]" :disabled="!canEditBase" :placeholder="`Objectif ${index + 1}`" :data-testid="`application-purpose-${index}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" title="Supprimer cet objectif" aria-label="Supprimer cet objectif" :disabled="!canEditBase" :data-testid="`application-purpose-remove-${index}`" @click="removePurpose(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un objectif" title="Ajouter un nouvel objectif" aria-label="Ajouter un objectif" :disabled="!canEditBase" data-testid="application-purpose-add" @click="addPurpose" />
      </div>
    </div>

    <div class="fr-form-group fr-mt-3w autocomplete-tags">
      <legend class="fr-label">
        Tags
      </legend>
      <div class="fr-mt-2w fr-col">
        <TagSearchSelect v-model:tags="form.tags" />
      </div>
    </div>

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="application-cancel-btn" @click="$emit('cancel')" />
      <DsfrButton type="submit" :disabled="isSubmitting" :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'" data-testid="application-submit-btn">
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm" data-testid="application-submit-loading">
            <span class="fr-loading__icon" aria-hidden="true" />
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
