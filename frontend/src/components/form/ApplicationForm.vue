<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import { regexFormatTag } from "@/utils/regex";
import { areFieldsModified } from "@/utils/fieldComparison";
import { priorityRestartLabelsOptions } from "@/composables/use-dictionary";
import type { ApplicationPriorityRestart, CreateLabelDto, LabelDto } from "@/client/types.gen";
import type { ApplicationWithPerms } from "@/models/Application";

const props = defineProps<{
  initialData?: ApplicationWithPerms
  labels: LabelDto[]
  isSubmitting?: boolean
}>();

const emit = defineEmits(["update:application", "submit", "cancel", "errorMessage"]);
const labelError = ref<string | undefined>(undefined);
const descriptionError = ref<string | undefined>(undefined);
const toaster = useToasterStore();

const initialLabels = ref<LabelDto[]>([]);

const form = ref<{
  label: string
  shortName: string
  labels: (CreateLabelDto & { id?: string })[]
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
  description: props.initialData?.description ?? "",
  targetPopulations: [...(props.initialData?.targetPopulations ?? [""])],
  logo: props.initialData?.logo ?? "",
  purposes: [...(props.initialData?.purposes ?? [""])],
  tags: [...(props.initialData?.tags ?? [""])],
  priorityRestart: props.initialData?.priorityRestart ?? null,
});


function handleSubmit() {
  labelError.value = undefined;
  descriptionError.value = undefined;
  let hasError = false;

  if (form.value.label.trim() === "") {
    labelError.value = "Le nom de l'application est obligatoire.";
    hasError = true;
  }
  if (form.value.description.trim() === "") {
    descriptionError.value = "La description est obligatoire.";
    hasError = true;
  }
  if (!validateAllTags()) {
    emit("errorMessage", "Certains tags sont invalides : un seul mot, uniquement lettres, chiffres ou tiret.");
    return;
  }

  const cleanedForm = {
    ...form.value,
    purposes: form.value.purposes.filter(p => p.trim() !== ""),
    tags: form.value.tags?.filter(t => t.trim() !== "") ?? [],
    priorityRestart: form.value.priorityRestart ?? undefined,
  };

  const generalFields = ["label", "shortName", "logo", "description", "targetPopulations", "purposes", "tags", "priorityRestart"];

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

watch(() => form.value.label, (newValue) => {
  if (newValue && newValue.trim() !== "") {
    labelError.value = undefined;
  }
});

watch(() => form.value.description, (newValue) => {
  if (newValue && newValue.trim() !== "") {
    descriptionError.value = undefined;
  }
});

onMounted(() => {
  initialLabels.value = props.labels ? JSON.parse(JSON.stringify(props.labels)) : [];
});
</script>

<template>
  <form data-testid="application-form" @submit.prevent="handleSubmit">
    <DsfrInputGroup
      v-model="form.label"
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
      v-model="form.shortName"
      :disabled="!initialData?.myPerms.has('writeBase')"
      class="fr-mt-3w"
      label="Nom court"
      label-visible
      hint="Optionnel - Un nom court pour identifier rapidement l'application"
      data-testid="application-shortname"
    />

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Noms alternatifs
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(_label, index) in form.labels" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div v-if="form.labels.length > 0" class="fr-col">
            <DsfrInput
              v-model="form.labels[index].source"
              :disabled="!initialData?.myPerms.has('writeBase')"
              :placeholder="`Reférentiel externe ${index + 1} (optionnel)`"
              :data-testid="`application-alt-label-source-${index}`"
            />
            <DsfrInput
              v-model="form.labels[index].value"
              :disabled="!initialData?.myPerms.has('writeBase')"
              :placeholder="`Nom ou identifiant externe ${index + 1}`"
              :data-testid="`application-alt-label-value-${index}`"
            />
          </div>
          <div class="fr-col-auto">
            <DsfrButton
              :disabled="!initialData?.myPerms.has('writeBase')"
              type="button"
              tertiary
              size="sm"
              icon="delete-line"
              label="Supprimer"
              :data-testid="`application-alt-label-remove-${index}`"
              @click="form.labels.splice(index, 1)"
            />
          </div>
        </div>
        <DsfrButton
          :disabled="!initialData?.myPerms.has('writeBase')"
          type="button"
          secondary
          icon="add-line"
          label="Ajouter un libellé"
          data-testid="application-alt-label-add"
          @click="form.labels.push({ source: '', value: '' })"
        />
      </div>
    </div>
    <br>
    <DsfrInputGroup
      class="fr-mt-3w"
      label="Description"
      label-visible
      required
      :error-message="descriptionError"
    >
      <MarkdownEditor
        v-model="form.description"
        :disabled="!initialData?.myPerms.has('writeBase')"
        data-testid="application-description"
      />
    </DsfrInputGroup>

    <DsfrSelect
      v-model="form.priorityRestart"
      :disabled="!initialData?.myPerms.has('writePriorityRestart')"
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
            <DsfrInput
              v-model="form.targetPopulations[index]"
              :disabled="!initialData?.myPerms.has('writeBase')"
              :data-testid="`application-population-${index}`"
            />
          </div>
          <div class="fr-col-auto">
            <DsfrButton
              type="button"
              :disabled="!initialData?.myPerms.has('writeBase')"
              tertiary
              size="sm"
              icon="delete-line"
              label="Supprimer"
              :data-testid="`application-population-remove-${index}`"
              @click="form.targetPopulations.splice(index, 1)"
            />
          </div>
        </div>
        <DsfrButton
          :disabled="!initialData?.myPerms.has('writeBase')"
          type="button"
          secondary
          icon="add-line"
          label="Ajouter une population"
          data-testid="application-population-add"
          @click="form.targetPopulations.push('')"
        />
      </div>
    </div>

    <DsfrInputGroup
      v-model="form.logo"
      :disabled="!initialData?.myPerms.has('writeBase')"
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
        <div v-for="(purpose, index) in form.purposes" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput
              v-model="form.purposes[index]"
              :disabled="!initialData?.myPerms.has('writeBase')"
              :placeholder="`Objectif ${index + 1}`"
              :data-testid="`application-purpose-${index}`"
            />
          </div>
          <div class="fr-col-auto">
            <DsfrButton
              :disabled="!initialData?.myPerms.has('writeBase')"
              type="button"
              tertiary
              size="sm"
              icon="delete-line"
              label="Supprimer"
              :data-testid="`application-purpose-remove-${index}`"
              @click="form.purposes.splice(index, 1)"
            />
          </div>
        </div>
        <DsfrButton
          :disabled="!initialData?.myPerms.has('writeBase')"
          type="button"
          secondary
          icon="add-line"
          label="Ajouter un objectif"
          data-testid="application-purpose-add"
          @click="form.purposes.push('')"
        />
      </div>
    </div>

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Tags
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(tag, index) in form.tags" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput
              v-model="form.tags[index]"
              :disabled="!initialData?.myPerms.has('writeBase')"
              :placeholder="`Tag ${index + 1}`"
              :data-testid="`application-tag-${index}`"
            />
          </div>
          <div class="fr-col-auto">
            <DsfrButton
              :disabled="!initialData?.myPerms.has('writeBase')"
              type="button"
              tertiary
              size="sm"
              icon="delete-line"
              label="Supprimer"
              :data-testid="`application-tag-remove-${index}`"
              @click="form.tags.splice(index, 1)"
            />
          </div>
        </div>
        <DsfrButton
          :disabled="!initialData?.myPerms.has('writeBase')"
          type="button"
          secondary
          icon="add-line"
          label="Ajouter un tag"
          data-testid="application-tag-add"
          @click="form.tags.push('')"
        />
      </div>
    </div>

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="application-cancel-btn" @click="$emit('cancel')" />
      <DsfrButton
        type="button"
        :disabled="isSubmitting"
        :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'"
        data-testid="application-submit-btn"
        @click="handleSubmit"
      >
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm" data-testid="application-submit-loading">
            <span class="fr-loading__icon" aria-hidden="true" />
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
