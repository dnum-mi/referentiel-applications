<script setup lang="ts">
import { ref } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import { regexFormatTag } from "@/utils/regex";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import { statusApplicationDictionary, priorityRestartLabelsOptions } from "@/composables/use-dictionary";
import type { ApplicationPriorityRestart, ApplicationStatus, CreateApplicationDto } from "@/client/types.gen";

defineProps<{ isSubmitting?: boolean }>();

const emit = defineEmits<{
  submit: [data: CreateApplicationDto]
  cancel: []
}>();

const toaster = useToasterStore();

const statusOptions = computed(() =>
  Object.keys(statusApplicationDictionary).map(value => ({
    value,
    text: statusApplicationDictionary[value as keyof typeof statusApplicationDictionary],
  })),
);

const form = ref<{
  label: string
  shortName: string
  description: string
  targetPopulations: string[]
  purposes: string[]
  tags: string[]
  status: ApplicationStatus | null
  priorityRestart: ApplicationPriorityRestart | null
}>({
  label: "",
  shortName: "",
  description: "",
  targetPopulations: [""],
  purposes: [""],
  tags: [""],
  status: null,
  priorityRestart: null,
});

function handleSubmit() {
  if (!validateAllTags()) {
    toaster.addErrorMessage("Certains tags sont invalides : un seul mot, uniquement lettres, chiffres ou tiret.");
    return;
  }
  const purposes = form.value.purposes.filter(p => p.trim() !== "");
  const tags = form.value.tags.filter(t => t.trim() !== "");
  const targetPopulations = form.value.targetPopulations.filter(t => t.trim() !== "");

  emit("submit", {
    label: form.value.label,
    shortName: form.value.shortName,
    logo: undefined,
    description: form.value.description,
    targetPopulations,
    purposes,
    tags,
    status: form.value.status as ApplicationStatus,
    priorityRestart: form.value.priorityRestart as ApplicationPriorityRestart,
    labels: [],
  });
}

function addPurpose() {
  form.value.purposes.push("");
}

function removePurpose(index: number) {
  form.value.purposes.splice(index, 1);
}

function addTag() {
  form.value.tags.push("");
}

function isTagValid(tag: string) {
  return regexFormatTag.test(tag);
}

function validateAllTags(): boolean {
  return form.value.tags.every(tag => isTagValid(tag));
}

function removeTag(index: number) {
  form.value.tags.splice(index, 1);
}

function addPopulation() {
  form.value.targetPopulations.push("");
}

function removePopulation(index: number) {
  form.value.targetPopulations.splice(index, 1);
}

const statusSelect = ref();
</script>

<template>
  <DsfrAlert
    title="Informations minimales"
    description="Cette étape permet de saisir uniquement les informations essentielles. Les autres éléments seront à compléter directement depuis la fiche de l'application, une fois celle-ci créée."
    type="info"
    class="fr-mb-3w"
  />
  <form data-testid="application-info-form" @submit.prevent="handleSubmit">
    <DsfrInputGroup v-model="form.label" label="Label" label-visible required data-testid="application-info-label" />

    <DsfrInputGroup
      v-model="form.shortName"
      class="fr-mt-3w"
      label="Nom court"
      label-visible
      hint="Optionnel - Un nom court pour identifier rapidement l'application"
      data-testid="application-info-shortname"
    />

    <DsfrSelect
      ref="statusSelect"
      v-model="form.status"
      :options="statusOptions"
      tabindex="0"
      label="Status de l'application"
      default-unselected-text="Sélectionner un status"
      data-testid="application-info-status"
    />

    <DsfrInputGroup class="fr-mt-3w" label="Description" label-visible required>
      <MarkdownEditor v-model="form.description" data-testid="application-info-description" />
    </DsfrInputGroup>

    <DsfrSelect
      v-model="form.priorityRestart"
      :options="priorityRestartLabelsOptions"
      label="Priorité de redémarrage"
      default-unselected-text="Sélectionner une priorité"
      data-testid="application-info-priority-restart"
    />

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Populations
      </legend>
      <p class="fr-hint-text">
        Indiquez ici le public cible concerné (ex. : RH, agents publics, entreprises...)
      </p>
      <div class="fr-mt-2w">
        <div v-for="(targetPopulation, index) in form.targetPopulations" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model="form.targetPopulations[index]" :placeholder="`Population ${index + 1}`" :data-testid="`application-info-population-${index}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" :data-testid="`application-info-population-remove-${index}`" @click="removePopulation(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter une population" data-testid="application-info-population-add" @click="addPopulation" />
      </div>
    </div>

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Objectifs
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(purpose, index) in form.purposes" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model="form.purposes[index]" :placeholder="`Objectif ${index + 1}`" :data-testid="`application-info-purpose-${index}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" :data-testid="`application-info-purpose-remove-${index}`" @click="removePurpose(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un objectif" data-testid="application-info-purpose-add" @click="addPurpose" />
      </div>
    </div>

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Tags
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(tag, index) in form.tags" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model="form.tags[index]" :placeholder="`Tag ${index + 1}`" :data-testid="`application-info-tag-${index}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" :data-testid="`application-info-tag-remove-${index}`" @click="removeTag(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un tag" data-testid="application-info-tag-add" @click="addTag" />
      </div>
    </div>

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="application-info-cancel-btn" @click="$emit('cancel')" />
      <DsfrButton type="submit" :disabled="isSubmitting" :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'" data-testid="application-info-submit-btn">
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm" data-testid="application-info-submit-loading">
            <span class="fr-loading__icon" aria-hidden="true" />
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
