<script setup lang="ts">
import type { Application, Label } from "@/models/Application";
import { ref } from "vue";
import useToaster from "@/composables/use-toaster";
import { regexFormatTag } from "@/utils/regex";
import { areFieldsModified } from "@/utils/fieldComparison";
import { addItem, removeItem } from "@/utils/arrayUtils";

const toaster = useToaster();

const props = defineProps<{
  initialData?: Application;
  labels: Label[];
  isSubmitting?: boolean;
}>();

const emit = defineEmits(["update:application", "submit", "cancel"]);

const initialLabels = ref<Label[]>([]);

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

  const cleanedForm = {
    ...form.value,
    purposes: form.value.purposes.filter((p) => p.trim() !== ""),
    tags: form.value.tags.filter((t) => t.trim() !== ""),
  };

  const generalFields = ["label", "shortName", "logo", "description", "targetPopulations", "purposes", "tags", "priorityRestart"];

  const isModified = areFieldsModified(props.initialData ?? {}, cleanedForm, generalFields);

  const currentLabels = form.value.labels;

  const deletedLabels = initialLabels.value.filter((initial) => !currentLabels.some((label) => label.id === initial.id));
  const newLabels = currentLabels.filter((label) => !initialLabels.value.some((initial) => initial.id === label.id));
  const updatedLabels = currentLabels.filter((label) => {
    const initial = initialLabels.value.find((i) => i.id === label.id);
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

const isTagValid = (tag: string) => {
  return regexFormatTag.test(tag);
};

const validateAllTags = (): boolean => {
  return form.value.tags.every((tag) => isTagValid(tag));
};

const addLabel = () => addItem(form.value.labels, { source: "", value: "" });
const removeLabel = (index: number) => removeItem(form.value.labels, index);

const addPurpose = () => addItem(form.value.purposes, "");
const removePurpose = (index: number) => removeItem(form.value.purposes, index);

const addTag = () => addItem(form.value.tags, "");
const removeTag = (index: number) => removeItem(form.value.tags, index);

const addPopulation = () => addItem(form.value.targetPopulations, "");
const removePopulation = (index: number) => removeItem(form.value.targetPopulations, index);

onMounted(() => {
  initialLabels.value = props.labels ? JSON.parse(JSON.stringify(props.labels)) : [];
});
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <DsfrInputGroup label="Nom de l'application" v-model="form.label" label-visible required />

    <DsfrInputGroup
      class="fr-mt-3w"
      label="Nom court"
      label-visible
      v-model="form.shortName"
      hint="Optionnel - Un nom court pour identifier rapidement l'application"
    />

    <div class="fr-form-group fr-mt-3w">
      <label class="fr-label">Noms alternatifs</label>
      <div class="fr-mt-2w">
        <div v-for="(label, index) in form.labels" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div v-if="form.labels.length > 0" class="fr-col">
            <DsfrInput v-model="form.labels[index].source" :placeholder="`Reférentiel externe ${index + 1} (optionnel)`" />
            <DsfrInput v-model="form.labels[index].value" :placeholder="`Nom ou identifiant externe ${index + 1}`" />
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
