<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { CreateHostingOptionDto, HostingOptionWithUsageDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api";

const props = defineProps<{
  hostingOption?: HostingOptionWithUsageDto;
}>();

const emit = defineEmits<{
  fetchHostingOptions: [];
}>();

type HostingOptionForm = Required<{ [K in keyof CreateHostingOptionDto]: string }>;

// Bornes alignées sur les colonnes VarChar du schéma Prisma (HostingOption).
const fields: { key: keyof HostingOptionForm; label: string; required: boolean; maxlength: number; hint?: string }[] = [
  { key: "provider", label: "Fournisseur", required: true, maxlength: 100, hint: "Exemple : DTNUM" },
  { key: "platform", label: "Plateforme", required: true, maxlength: 100, hint: "Exemple : VIRTUALISATION" },
  { key: "site", label: "Site", required: true, maxlength: 100, hint: "Exemple : CER(RENNES)" },
  { key: "building", label: "Bâtiment", required: false, maxlength: 100, hint: "Exemple : B15" },
  { key: "room", label: "Pièce", required: false, maxlength: 50, hint: "Exemple : IT2" },
];

const toaster = useToasterStore();

const isEditing = computed(() => !!props.hostingOption?.id);
const isEditModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isSaving = ref(false);
const isDeleting = ref(false);
const errorMessage = ref("");
const form = reactive<HostingOptionForm>({ provider: "", platform: "", site: "", building: "", room: "" });

const isFormValid = computed(() => fields.every((field) => !field.required || form[field.key].trim()));

const hostingsCount = computed(() => props.hostingOption?.hostingsCount ?? 0);
const optionLabel = computed(() => {
  const option = props.hostingOption;
  if (!option) return "";
  return [option.provider, option.platform, option.site, option.building, option.room].filter(Boolean).join(" / ");
});
const deleteDescription = computed(() => {
  const usage =
    hostingsCount.value > 0
      ? ` Elle est utilisée par ${hostingsCount.value} hébergement${hostingsCount.value > 1 ? "s" : ""} d'application : ${hostingsCount.value > 1 ? "ils ne seront plus rattachés" : "il ne sera plus rattaché"} à aucune plateforme.`
      : "";
  return `Êtes-vous sûr de vouloir supprimer la plateforme d'hébergement : ${optionLabel.value} ?${usage}`;
});

function openEditModal() {
  const option = props.hostingOption;
  form.provider = option?.provider ?? "";
  form.platform = option?.platform ?? "";
  form.site = option?.site ?? "";
  form.building = option?.building ?? "";
  form.room = option?.room ?? "";
  errorMessage.value = "";
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  errorMessage.value = "";
}

async function saveHostingOption() {
  isSaving.value = true;
  errorMessage.value = "";

  // Un bâtiment ou une pièce vidé est envoyé tel quel : l'API le convertit en null.
  const body = { ...form };
  const response = props.hostingOption?.id
    ? await api.hostingOptionControllerUpdate({ path: { id: props.hostingOption.id }, body })
    : await api.hostingOptionControllerCreate({ body });

  if (response.response.ok) {
    toaster.addSuccessMessage(
      isEditing.value ? "Plateforme d'hébergement mise à jour avec succès" : "Plateforme d'hébergement créée avec succès",
    );
    closeEditModal();
    emit("fetchHostingOptions");
  } else if (response.response.status === 409) {
    errorMessage.value = "Cette plateforme d'hébergement existe déjà.";
  } else if (response.response.status === 400) {
    errorMessage.value = "Les valeurs saisies sont incorrectes.";
  } else {
    errorMessage.value = "Erreur lors de la sauvegarde de la plateforme d'hébergement.";
  }
  isSaving.value = false;
}

async function deleteHostingOption() {
  if (!props.hostingOption?.id) return;

  isDeleting.value = true;
  const response = await api.hostingOptionControllerRemove({ path: { id: props.hostingOption.id } });
  if (response.response.ok) {
    toaster.addSuccessMessage("Plateforme d'hébergement supprimée avec succès");
    isDeleteModalOpen.value = false;
    emit("fetchHostingOptions");
  } else {
    toaster.addErrorMessage("Erreur lors de la suppression de la plateforme d'hébergement");
  }
  isDeleting.value = false;
}
</script>

<template>
  <DsfrButton
    v-if="!isEditing"
    class="fr-btn--icon-left fr-icon-add-line"
    label="Créer une plateforme"
    data-testid="admin-create-hosting-option-btn"
    title="Créer une nouvelle plateforme d'hébergement"
    @click="openEditModal"
  />

  <div v-else class="button-row">
    <DsfrButton
      label="Modifier"
      size="sm"
      secondary
      data-testid="admin-hosting-option-edit-btn"
      :title="`Modifier la plateforme d'hébergement ${optionLabel}`"
      @click="openEditModal"
    />
    <DsfrButton
      label="Supprimer"
      size="sm"
      secondary
      data-testid="admin-hosting-option-delete-btn"
      :title="`Supprimer la plateforme d'hébergement ${optionLabel}`"
      @click="isDeleteModalOpen = true"
    />
  </div>

  <DsfrModal
    :opened="isEditModalOpen"
    :title="isEditing ? 'Modifier la plateforme d\'hébergement' : 'Créer une plateforme d\'hébergement'"
    :data-testid="isEditing ? 'admin-edit-hosting-option-modal' : 'admin-create-hosting-option-modal'"
    @close="closeEditModal"
  >
    <form id="hosting-option-form" @submit.prevent="isFormValid && !isSaving && saveHostingOption()">
      <DsfrInputGroup
        v-for="field in fields"
        :key="field.key"
        v-model="form[field.key]"
        class="fr-mb-2w"
        :label="field.label"
        :hint="field.hint"
        label-visible
        :required="field.required"
        :maxlength="field.maxlength"
        :data-testid="`hosting-option-${field.key}`"
      />
    </form>

    <DsfrAlert v-if="errorMessage" :description="errorMessage" type="error" small class="fr-mb-2w" data-testid="hosting-option-error" />

    <template #footer>
      <DsfrButton label="Annuler" secondary data-testid="admin-cancel-btn" title="Annuler la modification" @click="closeEditModal" />
      <DsfrButton
        label="Enregistrer"
        type="submit"
        form="hosting-option-form"
        title="Enregistrer la plateforme d'hébergement"
        :disabled="isSaving || !isFormValid"
        data-testid="admin-save-hosting-option-btn"
      />
    </template>
  </DsfrModal>

  <DsfrModal
    :opened="isDeleteModalOpen"
    title="Supprimer la plateforme d'hébergement"
    data-testid="admin-delete-hosting-option-modal"
    @close="isDeleteModalOpen = false"
  >
    <DsfrAlert
      title="Cette action est irréversible"
      :description="deleteDescription"
      type="warning"
      class="fr-mb-3w alert-multiline"
      data-testid="hosting-option-delete-alert"
    />

    <template #footer>
      <DsfrButton
        label="Annuler"
        secondary
        data-testid="admin-delete-cancel-btn"
        title="Annuler la suppression"
        @click="isDeleteModalOpen = false"
      />
      <DsfrButton
        label="Supprimer"
        data-testid="admin-delete-confirm-btn"
        title="Confirmer la suppression"
        danger
        :disabled="isDeleting"
        @click="deleteHostingOption"
      />
    </template>
  </DsfrModal>
</template>

<style scoped>
.button-row {
  display: flex;
  gap: 1rem;
}
.alert-multiline {
  white-space: normal;
  word-wrap: break-word;
}
</style>
