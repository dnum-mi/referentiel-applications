<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { DsfrSelect } from "@gouvminint/vue-dsfr";
import { useHostingStore } from "@/stores/hostingStore";
import type { HostingOptionDto } from "@/client/types.gen";

const searchStore = useApplicationSearchStore();
const hostingStore = useHostingStore();

const allHostingOptions = ref<HostingOptionDto[]>([]);
const isLoading = ref(false);

// Simple computed filters that read/write directly to the store
const selectedSite = computed({
  get: () => searchStore.filters.hostingSite || "",
  set: (value) => {
    searchStore.filters.hostingSite = value || undefined;
    searchStore.filters.page = 0;
  },
});

const selectedPlatform = computed({
  get: () => searchStore.filters.hostingPlatform || "",
  set: (value) => {
    searchStore.filters.hostingPlatform = value || undefined;
    searchStore.filters.page = 0;
  },
});

const selectedProvider = computed({
  get: () => searchStore.filters.hostingProvider || "",
  set: (value) => {
    searchStore.filters.hostingProvider = value || undefined;
    searchStore.filters.page = 0;
  },
});

const selectedBuilding = computed({
  get: () => searchStore.filters.hostingBuilding || "",
  set: (value) => {
    searchStore.filters.hostingBuilding = value || undefined;
    searchStore.filters.page = 0;
  },
});

const selectedRoom = computed({
  get: () => searchStore.filters.hostingRoom || "",
  set: (value) => {
    searchStore.filters.hostingRoom = value || undefined;
    searchStore.filters.page = 0;
  },
});

// Filter options based on selections - bidirectional filtering
const siteOptions = computed(() => {
  let options = allHostingOptions.value;
  if (selectedPlatform.value) options = options.filter(o => o.platform === selectedPlatform.value);
  if (selectedProvider.value) options = options.filter(o => o.provider === selectedProvider.value);
  if (selectedBuilding.value) options = options.filter(o => o.building === selectedBuilding.value);
  if (selectedRoom.value) options = options.filter(o => o.room === selectedRoom.value);

  const sites = [...new Set(options.map(o => o.site))].sort();
  return [{ value: "", text: "Tous les sites" }, ...sites.map(s => ({ value: s, text: s }))];
});

const platformOptions = computed(() => {
  let options = allHostingOptions.value;
  if (selectedSite.value) options = options.filter(o => o.site === selectedSite.value);
  if (selectedProvider.value) options = options.filter(o => o.provider === selectedProvider.value);
  if (selectedBuilding.value) options = options.filter(o => o.building === selectedBuilding.value);
  if (selectedRoom.value) options = options.filter(o => o.room === selectedRoom.value);

  const platforms = [...new Set(options.map(o => o.platform))].sort();
  return [{ value: "", text: "Toutes les plateformes" }, ...platforms.map(p => ({ value: p, text: p }))];
});

const providerOptions = computed(() => {
  let options = allHostingOptions.value;
  if (selectedSite.value) options = options.filter(o => o.site === selectedSite.value);
  if (selectedPlatform.value) options = options.filter(o => o.platform === selectedPlatform.value);
  if (selectedBuilding.value) options = options.filter(o => o.building === selectedBuilding.value);
  if (selectedRoom.value) options = options.filter(o => o.room === selectedRoom.value);

  const providers = [...new Set(options.map(o => o.provider))].sort();
  return [{ value: "", text: "Tous les fournisseurs" }, ...providers.map(p => ({ value: p, text: p }))];
});

const buildingOptions = computed(() => {
  let options = allHostingOptions.value;
  if (selectedSite.value) options = options.filter(o => o.site === selectedSite.value);
  if (selectedPlatform.value) options = options.filter(o => o.platform === selectedPlatform.value);
  if (selectedProvider.value) options = options.filter(o => o.provider === selectedProvider.value);
  if (selectedRoom.value) options = options.filter(o => o.room === selectedRoom.value);

  const buildings = [...new Set(options.map(o => o.building).filter((b): b is string => Boolean(b)))].sort();
  return [{ value: "", text: "Tous les bâtiments" }, ...buildings.map(b => ({ value: b, text: b }))];
});

const roomOptions = computed(() => {
  let options = allHostingOptions.value;
  if (selectedSite.value) options = options.filter(o => o.site === selectedSite.value);
  if (selectedPlatform.value) options = options.filter(o => o.platform === selectedPlatform.value);
  if (selectedProvider.value) options = options.filter(o => o.provider === selectedProvider.value);
  if (selectedBuilding.value) options = options.filter(o => o.building === selectedBuilding.value);

  const rooms = [...new Set(options.map(o => o.room).filter((r): r is string => Boolean(r)))].sort();
  return [{ value: "", text: "Toutes les pièces" }, ...rooms.map(r => ({ value: r, text: r }))];
});

async function loadHostingOptions() {
  isLoading.value = true;
  try {
    allHostingOptions.value = await hostingStore.getAllHostingOptions();
  } catch (error) {
    console.error("Error loading hosting options:", error);
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadHostingOptions);
</script>

<template>
  <div class="hosting-filters">
    <DsfrSelect
      v-model="selectedProvider"
      label="Fournisseur"
      :options="providerOptions"
      :disabled="isLoading"
      data-testid="hosting-provider-select"
    />

    <DsfrSelect
      v-model="selectedPlatform"
      label="Plateforme"
      :options="platformOptions"
      :disabled="isLoading"
      data-testid="hosting-platform-select"
    />

    <DsfrSelect
      v-model="selectedSite"
      label="Site"
      :options="siteOptions"
      :disabled="isLoading"
      data-testid="hosting-site-select"
    />

    <DsfrSelect
      v-model="selectedBuilding"
      label="Bâtiment"
      :options="buildingOptions"
      :disabled="isLoading"
      data-testid="hosting-building-select"
    />

    <DsfrSelect
      v-model="selectedRoom"
      label="Pièce"
      :options="roomOptions"
      :disabled="isLoading"
      data-testid="hosting-room-select"
    />
  </div>
</template>

<style scoped>
.hosting-filters {
  display: flex;
  flex-direction: column;
}
</style>
