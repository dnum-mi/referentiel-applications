<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useSiteStore } from "@/stores/siteStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import PriorityRestartFilter from "./PriorityRestartFilter.vue";
import HostingOptions from "@/api/hosting-options";
import { DsfrInput } from "@gouvminint/vue-dsfr";

const searchStore = useApplicationSearchStore();
const siteStore = useSiteStore();

const selectedSiteId = ref(searchStore.filters.hostingSite || "");
const sites = ref<string[]>([]);
const platforms = ref<string[]>([]);
const providers = ref<string[]>([]);
const platformInput = ref(searchStore.filters.hostingPlatform || "");
const providerInput = ref(searchStore.filters.hostingProvider || "");
const buildingInput = ref(searchStore.filters.hostingBuilding || "");
const roomInput = ref(searchStore.filters.hostingRoom || "");

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

// Create a computed property for site options that includes both regular sites and hosting option sites
const siteOptions = computed(() => {
  const allSitesSet = new Set([...siteStore.sites.map((s: { id: string; label: string }) => s.label), ...sites.value]);

  return Array.from(allSitesSet).sort();
});

onMounted(async () => {
  siteStore.fetchAll();

  // Fetch platforms, providers and sites for autocomplete
  try {
    platforms.value = await HostingOptions.getPlatforms();
    providers.value = await HostingOptions.getProviders();
    sites.value = await HostingOptions.getSites();
  } catch (error) {
    console.error("Error fetching hosting options data:", error);
  }
});

watch(selectedSiteId, (newVal) => {
  searchStore.setFilter("hostingSite", newVal || "");
  searchStore.setFilter("page", 0);
  debouncedSearch();
});

watch(platformInput, (value) => {
  searchStore.setFilter("hostingPlatform", value);
  searchStore.setFilter("page", 0);
  debouncedSearch();
});

watch(providerInput, (value) => {
  searchStore.setFilter("hostingProvider", value);
  searchStore.setFilter("page", 0);
  debouncedSearch();
});

watch(buildingInput, (value) => {
  searchStore.setFilter("hostingBuilding", value);
  searchStore.setFilter("page", 0);
  debouncedSearch();
});

watch(roomInput, (value) => {
  searchStore.setFilter("hostingRoom", value);
  searchStore.setFilter("page", 0);
  debouncedSearch();
});

function clearSite() {
  selectedSiteId.value = "";
}

function clearPlatform() {
  platformInput.value = "";
  searchStore.setFilter("hostingPlatform", "");
  searchStore.setFilter("page", 0);
  debouncedSearch();
}

function clearProvider() {
  providerInput.value = "";
  searchStore.setFilter("hostingProvider", "");
  searchStore.setFilter("page", 0);
  debouncedSearch();
}

function clearBuilding() {
  buildingInput.value = "";
  searchStore.setFilter("hostingBuilding", "");
  searchStore.setFilter("page", 0);
  debouncedSearch();
}

function clearRoom() {
  roomInput.value = "";
  searchStore.setFilter("hostingRoom", "");
  searchStore.setFilter("page", 0);
  debouncedSearch();
}
</script>

<template>
  <div class="filter-section">
    <PriorityRestartFilter />

    <h3 class="filter-section-title">Hébergement</h3>

    <!-- Site filter -->
    <DsfrInput label-visible label="Site" v-model="selectedSiteId" list="sitesList" />
    <datalist id="sitesList">
      <option v-for="site in siteOptions" :key="site" :value="site"></option>
    </datalist>
    <div v-if="selectedSiteId" class="selected-tag">
      {{ selectedSiteId }}
      <span class="tag-remove" @click="clearSite">×</span>
    </div>

    <!-- Platform filter -->
    <DsfrInput label-visible label="Plateforme" v-model="platformInput" :list="'platformsList'" />
    <datalist id="platformsList">
      <option v-for="platform in platforms" :key="platform" :value="platform"></option>
    </datalist>
    <div v-if="searchStore.filters.hostingPlatform" class="selected-tag">
      {{ searchStore.filters.hostingPlatform }}
      <span class="tag-remove" @click="clearPlatform">×</span>
    </div>

    <!-- Provider filter -->
    <DsfrInput label-visible label="Fournisseur" v-model="providerInput" :list="'providersList'" />
    <datalist id="providersList">
      <option v-for="provider in providers" :key="provider" :value="provider"></option>
    </datalist>
    <div v-if="searchStore.filters.hostingProvider" class="selected-tag">
      {{ searchStore.filters.hostingProvider }}
      <span class="tag-remove" @click="clearProvider">×</span>
    </div>

    <!-- Building filter -->
    <DsfrInput label-visible label="Bâtiment" v-model="buildingInput" />
    <div v-if="searchStore.filters.hostingBuilding" class="selected-tag">
      {{ searchStore.filters.hostingBuilding }}
      <span class="tag-remove" @click="clearBuilding">×</span>
    </div>

    <!-- Room filter -->
    <DsfrInput label-visible label="Salle" v-model="roomInput" />
    <div v-if="searchStore.filters.hostingRoom" class="selected-tag">
      {{ searchStore.filters.hostingRoom }}
      <span class="tag-remove" @click="clearRoom">×</span>
    </div>
  </div>
</template>

<style scoped>
.filter-section {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-section-title {
  font-size: 1rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #000091;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  background: #e0edff;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #003366;
}

.tag-remove {
  cursor: pointer;
  margin-left: 0.5rem;
  font-weight: bold;
  color: #003366;
}

.tag-remove:hover {
  color: #d60000;
}
</style>
