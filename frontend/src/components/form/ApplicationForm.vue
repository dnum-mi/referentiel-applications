<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  initialData?: Object;
  isSubmitting?: boolean;
}>();

const emit = defineEmits(["update:application", "submit"]);

const handleSubmit = () => {
  const purposes = form.value.purposes.filter((p) => p.trim() !== "");
  const tags = form.value.tags.filter((t) => t.trim() !== "");

  emit("submit", {
    label: form.value.label,
    shortName: form.value.shortName || null,
    logo: form.value.logo || null,
    description: form.value.description,
    purposes,
    tags,
  });
};
const form = ref({
  label: props.initialData?.label ?? "",
  shortName: props.initialData?.shortName ?? "",
  description: props.initialData?.description ?? "",
  logo: props.initialData?.logo ?? "",
  purposes: [...(props.initialData?.purposes ?? [""])],
  tags: [...(props.initialData?.tags ?? [""])],
});

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

const removeTag = (index: number) => {
  form.value.tags.splice(index, 1);
  if (form.value.tags.length === 0) {
    form.value.tags.push("");
  }
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <DsfrInputGroup label="Label" v-model="form.label" required />

    <DsfrInputGroup
      class="fr-mt-3w"
      label="Nom court"
      v-model="form.shortName"
      hint="Optionnel - Un nom court pour identifier rapidement l'application"
    />

    <DsfrInputGroup class="fr-mt-3w" label="Description" v-model="form.description" required>
      <DsfrInput v-model="form.description" is-textarea required />
    </DsfrInputGroup>

    <DsfrInputGroup
      class="fr-mt-3w"
      label="URL du logo"
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
