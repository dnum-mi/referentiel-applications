<script setup lang="ts">
import type { Label } from "@/models/Application";
import { ref, computed, onMounted } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import { regexFormatTag } from "@/utils/regex";
import { areFieldsModified } from "@/utils/fieldComparison";
import { statusApplicationDictionary, priorityRestartLabelsOptions } from "@/composables/use-dictionary";
import type { ApplicationDto, ApplicationPriorityRestart, ApplicationStatus, CreateLabelDto, LabelDto } from "@/client/types.gen";

const props = defineProps<{
  initialData?: ApplicationDto
  labels: LabelDto[]
  isSubmitting?: boolean
}>();

// TODO typé les emits
const emit = defineEmits(["update:application", "submit", "cancel"]);

const toaster = useToasterStore();

const initialLabels = ref<Label[]>([]);

const statusOptions = computed(() =>
  Object.keys(statusApplicationDictionary).map(value => ({
    value,
    text: statusApplicationDictionary[value as keyof typeof statusApplicationDictionary],
  })),
);

const form = ref<{
  label: string
  shortName: string
  labels: (CreateLabelDto & { id?: string })[]
  status: ApplicationStatus | null
  description: string
  targetPopulations: string[]
  logo: string
  purposes: string[]
  tags: string[]
  priorityRestart: ApplicationPriorityRestart | null
}>({
  label: props.initialData?.label ?? "",
  shortName: props.initialData?.shortName ?? "",
  labels: props.labels ? [...props.labels] : [],
  status: props.initialData?.status ?? null,
  description: props.initialData?.description ?? "",
  targetPopulations: [...(props.initialData?.targetPopulations ?? [""])],
  logo: props.initialData?.logo ?? "",
  purposes: [...(props.initialData?.purposes ?? [""])],
  tags: [...(props.initialData?.tags ?? [""])],
  priorityRestart: props.initialData?.priorityRestart ?? null,
});

function handleSubmit() {
  if (!validateAllTags()) {
    toaster.addErrorMessage("Certains tags sont invalides : un seul mot, uniquement lettres, chiffres ou tiret.");
    return;
  }

  const cleanedForm = {
    ...form.value,
    purposes: form.value.purposes.filter(p => p.trim() !== ""),
    tags: form.value.tags?.filter(t => t.trim() !== "") ?? [],
  };

  const generalFields = ["label", "shortName", "logo", "description", "status", "targetPopulations", "purposes", "tags", "priorityRestart"];

  const isModified = areFieldsModified(props.initialData ?? {}, cleanedForm, generalFields);

  const currentLabels = form.value.labels;

  const deletedLabels = initialLabels.value.filter(initial => !currentLabels.some(label => label.id === initial.id));
  const newLabels = currentLabels.filter(label => !initialLabels.value.some(initial => initial.id === label.id));
  const updatedLabels = currentLabels.filter((label) => {
    const initial = initialLabels.value.find(i => i.id === label.id);
    return initial && areFieldsModified(initial, label, ["value", "source"]);
  });

  emit("submit", {
    deletedLabels,
    updatedLabels,
    newLabels,
    updatedInfo: isModified
      ? {
          ...cleanedForm,
          shortName: cleanedForm.shortName || null,
          logo: cleanedForm.logo || null,
          priorityRestart: cleanedForm.priorityRestart || null,
        }
      : null,
  });
}

function isTagValid(tag: string) {
  return regexFormatTag.test(tag);
}

function validateAllTags(): boolean {
  return form.value.tags.every(tag => isTagValid(tag));
}

onMounted(() => {
  initialLabels.value = props.labels ? JSON.parse(JSON.stringify(props.labels)) : [];
});
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <DsfrInputGroup v-model="form.label" label="Nom de l'application" label-visible required />

    <DsfrInputGroup
      v-model="form.shortName"
      class="fr-mt-3w"
      label="Nom court"
      label-visible
      hint="Optionnel - Un nom court pour identifier rapidement l'application"
    />

    <DsfrSelect
      v-model="form.status"
      :options="statusOptions"
      label="Status de l'application"
      default-unselected-text="Sélectionner un status"
    />

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Noms alternatifs
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(_label, index) in form.labels" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div v-if="form.labels.length > 0" class="fr-col">
            <DsfrInput v-model="form.labels[index].source" :placeholder="`Reférentiel externe ${index + 1} (optionnel)`" />
            <DsfrInput v-model="form.labels[index].value" :placeholder="`Nom ou identifiant externe ${index + 1}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" @click="form.labels.splice(index, 1)" />
          </div>
        </div>
        <DsfrButton
          type="button"
          secondary
          icon="add-line"
          label="Ajouter un libellé"
          @click="form.labels.push({ source: '', value: '' })"
        />
      </div>
    </div>
    <br>
    <DsfrInputGroup class="fr-mt-3w" label="Description" label-visible required>
      <MarkdownEditor v-model="form.description" />
    </DsfrInputGroup>

    <DsfrSelect
      v-model="form.priorityRestart"
      :options="priorityRestartLabelsOptions"
      label="Priorité de redémarrage"
      default-unselected-text="Sélectionner une priorité"
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
            <DsfrInput v-model="form.targetPopulations[index]" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton
              type="button"
              tertiary
              size="sm"
              icon="delete-line"
              label="Supprimer"
              @click="form.targetPopulations.splice(index, 1)"
            />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter une population" @click="form.targetPopulations.push('')" />
      </div>
    </div>

    <DsfrInputGroup
      v-model="form.logo"
      class="fr-mt-3w"
      label="URL du logo"
      label-visible
      hint="Optionnel - URL d'une image représentant l'application"
    />

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Objectifs
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(purpose, index) in form.purposes" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model="form.purposes[index]" :placeholder="`Objectif ${index + 1}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" @click="form.purposes.splice(index, 1)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un objectif" @click="form.purposes.push('')" />
      </div>
    </div>

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Tags
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(tag, index) in form.tags" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model="form.tags[index]" :placeholder="`Tag ${index + 1}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" @click="form.tags.splice(index, 1)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un tag" @click="form.tags.push('')" />
      </div>
    </div>

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" @click="$emit('cancel')" />
      <DsfrButton type="button" :disabled="isSubmitting" :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'" @click="handleSubmit">
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm">
            <span class="fr-loading__icon" aria-hidden="true" />
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
