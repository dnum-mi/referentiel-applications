<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from "vue";
import type { Hosting } from "@/models/Hosting";
import { useHostingStore } from "@/stores/hostingStore";
import useToaster from "@/composables/use-toaster";

const props = defineProps<{
  applicationId: string;
  initialHosting?: Hosting;
}>();

const emit = defineEmits(["close"]);

const hostingForm = ref({
  region: "",
  site: "",
  platform: "",
});

const isSubmitting = ref(false);
const hostingStore = useHostingStore();
const toaster = useToaster();
const siteSuggestions = ref<{ id: string; label: string }[]>([]);
const platformSuggestions = ref<{ id: string; label: string }[]>([]);

onMounted(async () => {
  siteSuggestions.value = await hostingStore.fetchSites();
  platformSuggestions.value = await hostingStore.fetchPlatforms();
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
  isSubmitting.value = true;
  try {
    if (props.initialHosting) {
      await hostingStore.updateHosting(props.applicationId, {
        ...hostingForm.value,
        id: props.initialHosting.id,
      });
    } else {
      await hostingStore.createHosting(props.applicationId, hostingForm.value);
    }
    emit("close");
  } catch (err) {
    console.error(err);
    toaster.addErrorMessage("Erreur lors de l'enregistrement.");
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
      <SuggestionsInput label="Site" v-model:returnData="hostingForm.site" :searchData="siteSuggestions" />

      <SuggestionsInput label="Plateforme" v-model:returnData="hostingForm.platform" :searchData="platformSuggestions" />
    </div>
    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton secondary label="Annuler" @click="$emit('close')" />
      <DsfrButton type="button" :disabled="isSubmitting" :label="props.initialHosting ? 'Modifier' : 'Créer'" @click="handleSubmit" />
    </div>
  </DsfrModal>
</template>
