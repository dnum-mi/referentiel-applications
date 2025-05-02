<script setup lang="ts">
import { ref, defineProps, defineEmits, watch, onMounted, computed } from "vue";
import type { Hosting } from "@/models/Hosting";
import { useHostingStore } from "@/stores/hostingStore";
import useToaster from "@/composables/use-toaster";
import HostingLookups from "@/api/hosting-lookups";

const props = defineProps<{
  applicationId: string;
  initialHosting?: Hosting;
}>();

const emit = defineEmits(["close", "hosting-created", "hosting-updated"]);

const hostingForm = ref({
  provider: "",
  label: "",
  region: "",
  site: "",
  nature: "",
  platform: "",
});

const providers = ref([]);
const hostingSites = ref([]);
const platforms = ref([]);
const isLoadingOptions = ref(false);

const natureOptions = [
  { value: "", text: "Sélectionner une nature" },
  { value: "CLOUD", text: "Cloud" },
  { value: "ON_PREMISE", text: "Sur site" },
  { value: "HYBRID", text: "Hybride" },
  { value: "OTHER", text: "Autre" },
];

const isSubmitting = ref(false);
const hostingStore = useHostingStore();
const toaster = useToaster();

const providerOptions = computed(() => [
  { value: "", text: "Sélectionner un fournisseur" },
  ...providers.value.map((provider) => ({
    value: provider.name,
    text: provider.name,
  })),
]);

const siteOptions = computed(() => [
  { value: "", text: "Sélectionner un site" },
  ...hostingSites.value.map((site) => ({
    value: site.name,
    text: site.name,
  })),
]);

const platformOptions = computed(() => [
  { value: "", text: "Sélectionner une plateforme" },
  ...platforms.value.map((platform) => ({
    value: platform.name,
    text: platform.name,
  })),
]);

const fetchLookupData = async () => {
  try {
    isLoadingOptions.value = true;
    const [providersData, sitesData, platformsData] = await Promise.all([
      HostingLookups.getProviders(),
      HostingLookups.getHostingSites(),
      HostingLookups.getPlatforms(),
    ]);

    providers.value = providersData;
    hostingSites.value = sitesData;
    platforms.value = platformsData;
  } catch (error) {
    console.error("Error fetching lookup data:", error);
    toaster.addErrorMessage("Erreur lors du chargement des données de référence.");
  } finally {
    isLoadingOptions.value = false;
  }
};

onMounted(() => {
  fetchLookupData();
});

watch(
  () => props.initialHosting,
  (newVal) => {
    if (newVal) {
      hostingForm.value = {
        provider: newVal.provider || "",
        label: newVal.label || "",
        region: newVal.region || "",
        site: newVal.site || "",
        nature: newVal.nature || "",
        platform: newVal.platform || "",
      };
    }
  },
  { immediate: true },
);

const handleSubmit = async () => {
  isSubmitting.value = true;
  try {
    if (props.initialHosting) {
      const updatedHosting = await hostingStore.updateHosting(props.applicationId, {
        ...hostingForm.value,
        id: props.initialHosting.id,
        applicationId: props.applicationId,
      } as Hosting);
      emit("hosting-updated", updatedHosting);
    } else {
      const newHosting = await hostingStore.createHosting(props.applicationId, {
        ...hostingForm.value,
        applicationId: props.applicationId,
      } as Partial<Hosting> as Hosting);
      emit("hosting-created", newHosting);
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
    <div v-if="isLoadingOptions" class="fr-text--center fr-mb-2w">
      <span class="fr-loading fr-loading--sm">
        <span class="fr-loading__icon" aria-hidden="true"></span>
      </span>
      Chargement des options...
    </div>

    <div class="fr-form-group">
      <DsfrInput label-visible label="Label" v-model="hostingForm.label" class="fr-mb-3w" />

      <DsfrSelect v-model="hostingForm.provider" label="Fournisseur" :options="providerOptions" class="fr-mb-3w" />

      <DsfrSelect v-model="hostingForm.site" label="Site d'hébergement" :options="siteOptions" class="fr-mb-3w" />

      <DsfrInput label-visible label="Région" v-model="hostingForm.region" class="fr-mb-3w" />

      <DsfrSelect v-model="hostingForm.nature" label="Nature" :options="natureOptions" class="fr-mb-3w" required />

      <DsfrSelect v-model="hostingForm.platform" label="Plateforme" :options="platformOptions" />
    </div>
    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton secondary label="Annuler" @click="$emit('close')" />
      <DsfrButton
        type="button"
        :disabled="isSubmitting || isLoadingOptions"
        :label="props.initialHosting ? 'Modifier' : 'Créer'"
        @click="handleSubmit"
      >
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm">
            <span class="fr-loading__icon" aria-hidden="true"></span>
          </span>
        </template>
      </DsfrButton>
    </div>
  </DsfrModal>
</template>
