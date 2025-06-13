<script setup lang="ts">
import type { Application, Label } from "@/models/Application";
import { ref } from "vue";
import useToaster from "@/composables/use-toaster";
import { regexFormatTag } from "@/utils/regex";

const toaster = useToaster();

const props = defineProps<{
  initialData?: Application;
  labels: Label[];
  isSubmitting?: boolean;
}>();

const emit = defineEmits(["update:application", "submit", "cancel"]);

const priorityRestartOptions = [
  { value: "", text: "Sélectionner une priorité" },
  { value: "R0", text: "R0 - Immédiat (H24)" },
  { value: "R1", text: "R1 - Dès que le socle technique est rétabli (H24)" },
  { value: "R1_STAR", text: "R1* - Selon période d'activité" },
  { value: "R2", text: "R2 - Dès que possible (H24)" },
  { value: "R3", text: "R3 - Quand le plus urgent est réalisé (H0)" },
];

const handleSubmit = () => {
  if (!validateAllTags()) {
    toaster.addErrorMessage("Certains tags sont invalides : un seul mot, uniquement lettres, chiffres ou tiret.");
    return;
  }
  const purposes = form.value.purposes.filter((p) => p.trim() !== "");
  const tags = form.value.tags.filter((t) => t.trim() !== "");
  const initialLabels = props.labels ?? [];
  const currentLabels = form.value.labels;

  const deletedLabels = initialLabels.filter((initialLabel) => !currentLabels.some((label) => label.id === initialLabel.id));
  const newLabels = currentLabels.filter((label) => !initialLabels.some((initialLabel) => label.id === initialLabel.id));
  const updatedLabels = currentLabels.filter((label) => label.id !== undefined);

  emit("submit", {
    labels: currentLabels,
    deletedLabels,
    updatedLabels,
    newLabels,
    label: form.value.label,
    shortName: form.value.shortName || null,
    logo: form.value.logo || null,
    description: form.value.description,
    targetPopulations: form.value.targetPopulations,
    purposes,
    tags,
    priorityRestart: form.value.priorityRestart || null,
  });
};

const form = ref({
  label: props.initialData?.label ?? "",
  shortName: props.initialData?.shortName ?? "",
  labels: ref(props.labels ? [...props.labels] : []),
  description: props.initialData?.description ?? "",
  targetPopulations: [...(props.initialData?.targetPopulations ?? [""])],
  logo: props.initialData?.logo ?? "",
  purposes: [...(props.initialData?.purposes ?? [""])],
  tags: [...(props.initialData?.tags ?? [""])],
  priorityRestart: props.initialData?.priorityRestart ?? "",
});

const addLabel = () => {
  form.value.labels.push({ source: "", value: "" });
};

const removeLabel = (index: number) => {
  form.value.labels.splice(index, 1);
};

const addPurpose = () => {
  form.value.purposes.push("");
};

const removePurpose = (index: number) => {
  form.value.purposes.splice(index, 1);
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
    <DsfrInputGroup label="Label" v-model="form.label" label-visible required />

    <DsfrInputGroup
      class="fr-mt-3w"
      label="Nom court"
      label-visible
      v-model="form.shortName"
      hint="Optionnel - Un nom court pour identifier rapidement l'application"
    />

    <div class="fr-form-group fr-mt-3w">
      <label class="fr-label">Libellés alternatifs</label>
      <div class="fr-mt-2w">
        <div v-for="(label, index) in form.labels" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div v-if="form.labels.length > 0" class="fr-col">
            <DsfrInput v-model="form.labels[index].source" :placeholder="`Source ${index + 1}`" :required="form.labels.length > 0" />
            <DsfrInput v-model="form.labels[index].value" :placeholder="`Valeur ${index + 1}`" />
          </div>
          <div class="fr-col-auto">
            <DsfrButton type="button" tertiary size="sm" icon="delete-line" label="Supprimer" @click="removeLabel(index)" />
          </div>
        </div>
        <DsfrButton type="button" secondary icon="add-line" label="Ajouter un libellé" @click="addLabel" />
      </div>
    </div>
    <br />
    <DsfrInputGroup class="fr-mt-3w" label="Description" label-visible required>
      <MarkdownEditor v-model="form.description" />
    </DsfrInputGroup>

    <DsfrSelect
      v-model="form.priorityRestart"
      :options="priorityRestartOptions"
      label="Priorité de redémarrage"
      default-unselected-text="Sélectionner une priorité"
    />

    <div class="fr-form-group fr-mt-3w">
      <label class="fr-label">Population</label>
      <p class="fr-hint-text">Indiquez ici le public cible concerné (ex. : RH, agents publics, entreprises...)</p>
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
