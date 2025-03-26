<script setup lang="ts">
import type { Application } from "@/models/Application";
import { ref } from "vue";
import useToaster from "@/composables/use-toaster";
import { regexFormatTag } from "@/utils/regex";

const toaster = useToaster();

const props = defineProps<{
  initialData?: Application;
  isSubmitting?: boolean;
}>();

const emit = defineEmits(["update:application", "submit", "cancel"]);

const handleSubmit = () => {
  if (!validateAllTags()) {
    toaster.addErrorMessage("Certains tags sont invalides : un seul mot, uniquement lettres, chiffres ou tiret.");
    return;
  }
  const purposes = form.value.purposes.filter((p) => p.trim() !== "");
  const tags = form.value.tags.filter((t) => t.trim() !== "");
  const labels = form.value.labels.filter((l) => l.label.trim() !== "");

  const initialLabels = props.initialData?.labels ?? [];
  const currentLabels = form.value.labels;

  // Labels supprimés
  const deletedLabels = initialLabels.filter(
    (initialLabel) => !currentLabels.some((label) => label.label === initialLabel.label && label.source === initialLabel.source),
  );

  // Labels créés
  const newLabels = currentLabels.filter(
    (label) => !initialLabels.some((initialLabel) => initialLabel.label === label.label && initialLabel.source === label.source),
  );

  emit("submit", {
    labels: currentLabels,
    deletedLabels,
    newLabels,
    logo: form.value.logo || null,
    description: form.value.description,
    targetPopulations: form.value.targetPopulations,
    purposes,
    tags,
  });
  console.log("submit", {
    label: form.value.label,
    shortName: form.value.shortName || null,
    logo: form.value.logo || null,
    description: form.value.description,
    targetPopulations: form.value.targetPopulations,
    purposes,
    tags,
  });
};

const form = ref({
  labels: ref(props.initialData?.labels ? [...props.initialData.labels] : []),
  description: props.initialData?.description ?? "",
  targetPopulations: [...(props.initialData?.targetPopulations ?? [""])],
  logo: props.initialData?.logo ?? "",
  purposes: [...(props.initialData?.purposes ?? [""])],
  tags: [...(props.initialData?.tags ?? [""])],
});

const isExistingLabel = (index: number) => index < (props.initialData?.labels?.length ?? 0);

const addLabel = () => {
  form.value.labels.push({ source: "", label: "", shortname: "" });
};

const removeLabel = (index: number) => {
  form.value.labels.splice(index, 1);
  if (form.value.labels.length === 0) {
    form.value.labels.push({ source: "", label: "", shortname: "" });
  }
};

const addPurpose = () => {
  form.value.purposes.push("");
};

const removePurpose = (index: number) => {
  form.value.purposes.splice(index, 1);
  if (form.value.purposes.length === 0) {
    form.value.purposes.push("");
  }
};

const addTag = () => {
  form.value.tags.push("");
};

const isTagValid = (tag: string) => {
  return regexFormatTag.test(tag);
};

const validateAllTags = (): boolean => {
  return form.value.tags.every((tag) => isTagValid(tag));
};

const removeTag = (index: number) => {
  form.value.tags.splice(index, 1);
  if (form.value.tags.length === 0) {
    form.value.tags.push("");
  }
};

const addPopulation = () => {
  form.value.targetPopulations.push("");
};

const removePopulation = (index: number) => {
  form.value.targetPopulations.splice(index, 1);
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="fr-form-group fr-mt-3w">
      <label class="fr-label">Labels</label>
      <div class="fr-mt-2w">
        <div v-for="(label, index) in form.labels" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput
              v-model="form.labels[index].source"
              :placeholder="`Source ${index + 1}`"
              required
              :disabled="isExistingLabel(index)"
            />
            <DsfrInput v-model="form.labels[index].label" :placeholder="`Label ${index + 1}`" required :disabled="isExistingLabel(index)" />
            <DsfrInput
              v-model="form.labels[index].shortname"
              :placeholder="`Nom court (optionnel) ${index + 1}`"
              :disabled="isExistingLabel(index)"
            />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" @click="removeLabel(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un label" @click="addLabel" />
      </div>
    </div>

    <DsfrInputGroup class="fr-mt-3w" v-model="form.description" required>
      <DsfrInput v-model="form.description" class="fr-mt-3w" label="Description" label-visible is-textarea required />
    </DsfrInputGroup>

    <div class="fr-form-group fr-mt-3w">
      <label class="fr-label">Population</label>
      <div class="fr-mt-2w">
        <div v-for="(targetPopulation, index) in form.targetPopulations" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model="form.targetPopulations[index]" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" @click="removePopulation(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter une population" @click="addPopulation" />
      </div>
    </div>

    <DsfrInputGroup
      class="fr-mt-3w"
      label="URL du logo"
      label-visible
      v-model="form.logo"
      hint="Optionnel - URL d'une image représentant l'application"
    />

    <div class="fr-form-group fr-mt-3w">
      <label class="fr-label">Objectifs</label>
      <div class="fr-mt-2w">
        <div v-for="(purpose, index) in form.purposes" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model="form.purposes[index]" :placeholder="`Objectif ${index + 1}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" @click="removePurpose(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un objectif" @click="addPurpose" />
      </div>
    </div>

    <div class="fr-form-group fr-mt-3w">
      <label class="fr-label">Tags</label>
      <div class="fr-mt-2w">
        <div v-for="(tag, index) in form.tags" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput v-model="form.tags[index]" :placeholder="`Tag ${index + 1}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" @click="removeTag(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un tag" @click="addTag" />
      </div>
    </div>

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton secondary label="Annuler" @click="$emit('cancel')" />
      <DsfrButton type="submit" :disabled="isSubmitting" :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'">
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm">
            <span class="fr-loading__icon" aria-hidden="true"></span>
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
