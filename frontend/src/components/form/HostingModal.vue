<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from "vue";
import useToaster from "@/composables/use-toaster";
import Hostings from "@/api/hosting";

const props = defineProps<{
  applicationId: string;
  initialHosting?: Hosting;
}>();

const emit = defineEmits<{
  (e: "hosting-created", hosting: Hosting): void;
  (e: "hosting-updated", hosting: Hosting): void;
  (e: "close"): void;
}>();

const toaster = useToaster();
const isSubmitting = ref(false);

const natureOptions = [
  { value: "", text: "Sélectionnez une Nature" },
  { value: "NON_DEFINIE", text: "NON DEFINIE" },
  { value: "PHYSIQUE", text: "PHYSIQUE" },
  { value: "VIRTUEL", text: "VIRTUEL" },
  { value: "CLOUD", text: "CLOUD" },
  { value: "BARRE_METAL", text: "BARRE_METAL" },
];

const hostingForm = ref({
  region: "",
  site: "",
  platform: "",
});

watch(
  () => props.initialHosting,
  (newVal) => {
    if (newVal) {
      hostingForm.value = {
        region: newVal.region,
        site: newVal.site,
        platform: newVal.platform,
      };
    }
  },
  { immediate: true },
);

const handleSubmit = async () => {
  if (!props.applicationId) {
    toaster.addErrorMessage("L'application doit être créée avant d'ajouter un hébergement.");
    return;
  }
  isSubmitting.value = true;
  try {
    if (props.initialHosting) {
      // Mise à jour d'un hébergement existant
      const updatedHosting = await Hostings.update(props.initialHosting.id, hostingForm.value, props.applicationId);
      toaster.addSuccessMessage("Hébergement mis à jour avec succès");
      emit("hosting-updated", updatedHosting);
    } else {
      // Création d'un nouvel hébergement
      const newHosting = await Hostings.create(hostingForm.value, props.applicationId);
      toaster.addSuccessMessage("Hébergement créé avec succès");
      // Réinitialisation du formulaire après création
      hostingForm.value = {
        region: "",
        site: "",
        platform: "",
      };
      emit("hosting-created", newHosting);
    }
    emit("close");
  } catch (error) {
    console.error(error);
    toaster.addErrorMessage("Erreur lors de l'opération sur l'hébergement.");
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <DsfrModal :opened="true" :title="props.initialHosting ? 'Modifier un hébergement' : 'Créer un hébergement'" @close="$emit('close')">
    <div class="fr-form-group">
      <DsfrInput label-visible label="Région" v-model="hostingForm.region" />
      <DsfrInput label-visible label="Site" v-model="hostingForm.site" />
      <DsfrInput label-visible label="Plateforme" v-model="hostingForm.platform" />
    </div>
    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton secondary label="Annuler" @click="$emit('close')" />
      <DsfrButton type="button" :disabled="isSubmitting" :label="props.initialHosting ? 'Modifier' : 'Créer'" @click="handleSubmit" />
    </div>
  </DsfrModal>
</template>
