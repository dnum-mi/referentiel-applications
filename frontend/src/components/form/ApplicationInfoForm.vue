<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToasterStore } from "@/stores/toasterStore";
import { regexFormatTag } from "@/utils/regex";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import { statusApplicationDictionary, priorityRestartLabelsOptions } from "@/composables/use-dictionary";
import api from "@/api/index";
import type { CreateApplicationDto, ApplicationDto } from "@/client/types.gen";

type FormData = Omit<CreateApplicationDto, "targetPopulations" | "purposes" | "tags"> & {
  targetPopulations: string[]
  purposes: string[]
  tags: string[]
};

const emit = defineEmits<{
  success: [application: ApplicationDto]
  cancel: []
  errorMessage: [message: string]
}>();

const toaster = useToasterStore();
const router = useRouter();
const isSubmitting = ref(false);

const statusOptions = computed(() =>
  Object.keys(statusApplicationDictionary).map(value => ({
    value,
    text: statusApplicationDictionary[value as keyof typeof statusApplicationDictionary],
  })),
);

const form = ref<FormData>({
  label: "",
  shortName: "",
  description: "",
  targetPopulations: [""],
  purposes: [""],
  tags: [""],
  status: undefined,
  priorityRestart: undefined,
  labels: [],
  logo: undefined,
});

async function handleSubmit() {
  if (!validateAllTags()) {
    emit("errorMessage", "Certains tags sont invalides : un seul mot, uniquement lettres, chiffres ou tiret.");
    return;
  }

  // Filter out empty values, handle undefined arrays
  const filterEmpty = (arr: string[] | undefined) => arr?.filter(item => item.trim() !== "");

  const applicationData: CreateApplicationDto = {
    ...form.value,
    targetPopulations: filterEmpty(form.value.targetPopulations),
    purposes: filterEmpty(form.value.purposes),
    tags: filterEmpty(form.value.tags),
    status: form.value.status!,
    priorityRestart: form.value.priorityRestart!,
  };

  isSubmitting.value = true;

  try {
    const response = await api.applicationControllerCreate({ body: applicationData });
    const application = response.data as ApplicationDto;

    toaster.addSuccessMessage("Application créée avec succès !");
    router.push({ name: "application", params: { id: application.id } });
    emit("success", application);
  } catch (error) {
    console.error("Erreur lors de la création de l'application:", error);
    toaster.addErrorMessage("Erreur lors de la création de l'application.");
  } finally {
    isSubmitting.value = false;
  }
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

function validateAllTags(): boolean {
  return form.value.tags.every(tag => tag === "" || regexFormatTag.test(tag));
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
      v-model="form.status"
      :options="statusOptions"
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
            <DsfrInput v-model="form.targetPopulations![index]" :placeholder="`Population ${index + 1}`" :data-testid="`application-info-population-${index}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" title="Supprimer cette population" aria-label="Supprimer cette population" :data-testid="`application-info-population-remove-${index}`" @click="removePopulation(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter une population" title="Ajouter une nouvelle population" aria-label="Ajouter une population" data-testid="application-info-population-add" @click="addPopulation" />
      </div>
    </div>

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Objectifs
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(purpose, index) in form.purposes" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model="form.purposes![index]" :placeholder="`Objectif ${index + 1}`" :data-testid="`application-info-purpose-${index}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" title="Supprimer cet objectif" aria-label="Supprimer cet objectif" :data-testid="`application-info-purpose-remove-${index}`" @click="removePurpose(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un objectif" title="Ajouter un nouvel objectif" aria-label="Ajouter un objectif" data-testid="application-info-purpose-add" @click="addPurpose" />
      </div>
    </div>

    <div class="fr-form-group fr-mt-3w">
      <legend class="fr-label">
        Tags
      </legend>
      <div class="fr-mt-2w">
        <div v-for="(tag, index) in form.tags" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model="form.tags![index]" :placeholder="`Tag ${index + 1}`" :data-testid="`application-info-tag-${index}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" title="Supprimer ce tag" aria-label="Supprimer ce tag" :data-testid="`application-info-tag-remove-${index}`" @click="removeTag(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un tag" title="Ajouter un nouveau tag" aria-label="Ajouter un tag" data-testid="application-info-tag-add" @click="addTag" />
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
