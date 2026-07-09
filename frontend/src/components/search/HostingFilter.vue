<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { DsfrSelect } from "@gouvminint/vue-dsfr";
import { useHostingStore } from "@/stores/hostingStore";
import type { HostingOptionDto } from "@/client/types.gen";
import type { Filters } from "@/composables/use-application-search";

const { filters, setFilter } = useApplicationSearch();
const hostingStore = useHostingStore();

const allHostingOptions = ref<HostingOptionDto[]>([]);
const isLoading = ref(false);

type HostingField = "site" | "platform" | "provider" | "building" | "room";
type FilterKey = "hostingSite" | "hostingPlatform" | "hostingProvider" | "hostingBuilding" | "hostingRoom";

const hostingFields: { field: HostingField; filterKey: FilterKey; label: string; testId: string }[] = [
  { field: "provider", filterKey: "hostingProvider", label: "Tous les fournisseurs", testId: "hosting-provider-select" },
  { field: "platform", filterKey: "hostingPlatform", label: "Toutes les plateformes", testId: "hosting-platform-select" },
  { field: "site", filterKey: "hostingSite", label: "Tous les sites", testId: "hosting-site-select" },
  { field: "building", filterKey: "hostingBuilding", label: "Tous les bâtiments", testId: "hosting-building-select" },
  { field: "room", filterKey: "hostingRoom", label: "Toutes les pièces", testId: "hosting-room-select" },
];

function getFilteredOptions(excludeField: HostingField) {
  return allHostingOptions.value.filter((o) => {
    for (const { field, filterKey } of hostingFields) {
      if (field === excludeField) continue;
      const filterValue = filters.value[filterKey];
      if (filterValue && o[field] !== filterValue) return false;
    }
    return true;
  });
}

function createOptions(field: HostingField, defaultLabel: string) {
  return computed(() => {
    const options = getFilteredOptions(field);
    const values = [...new Set(options.map((o) => o[field]).filter(Boolean))].sort() as string[];
    return [{ value: "", text: defaultLabel }, ...values.map((v) => ({ value: v, text: v }))];
  });
}

const optionsMap = Object.fromEntries(hostingFields.map(({ field, label }) => [field, createOptions(field, label)])) as Record<
  HostingField,
  ReturnType<typeof createOptions>
>;

function updateFilter(filterKey: FilterKey, value: string) {
  setFilter({ [filterKey]: value || undefined, page: 0 } as Partial<Filters>);
}

const missingHosting = computed({
  get: () => (filters.value.missingHosting ? [true] : []),
  set: (value: boolean[]) => setFilter({ missingHosting: value.includes(true) ? true : undefined, page: 0 }),
});

async function loadHostingOptions() {
  isLoading.value = true;
  try {
    allHostingOptions.value = await hostingStore.getAllHostingOptions();
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadHostingOptions);

const labels: Record<HostingField, string> = {
  site: "Site",
  platform: "Plateforme",
  provider: "Fournisseur",
  building: "Bâtiment",
  room: "Pièce",
};

const tooltips: Record<HostingField, string> = {
  provider: "Filtre les applications selon leur fournisseur d’hébergement (ex. cloud, datacenter interne…).",
  platform: "Filtre les applications selon la plateforme d’hébergement utilisée.",
  site: "Filtre les applications selon le site d’hébergement physique.",
  building: "Filtre les applications selon le bâtiment d’hébergement.",
  room: "Filtre les applications selon la pièce (salle) d’hébergement.",
};
</script>

<template>
  <div class="hosting-filters">
    <DsfrCheckbox
      v-model="missingHosting"
      name="hosting-missing-checkbox"
      :value="true"
      aria-describedby="hosting-missing-tooltip-desc"
      data-testid="hosting-missing-checkbox"
    >
      <template #label>
        <span class="content" style="display: inline-flex; align-items: center; gap: 0.25rem">
          Sans hébergement
          <DsfrTooltip id="hosting-missing-tooltip-desc" content="Affiche uniquement les applications sans hébergement renseigné." />
        </span>
      </template>
    </DsfrCheckbox>

    <DsfrSelect
      v-for="{ field, filterKey, testId } in hostingFields"
      :key="field"
      :model-value="filters[filterKey] || ''"
      :options="optionsMap[field].value"
      :disabled="isLoading"
      :aria-describedby="`hosting-${field}-tooltip-desc`"
      :data-testid="testId"
      @update:model-value="updateFilter(filterKey, String($event ?? ''))"
    >
      <template #label>
        <span style="display: inline-flex; align-items: center; gap: 0.25rem">
          {{ labels[field] }}
          <DsfrTooltip :id="`hosting-${field}-tooltip-desc`" :content="tooltips[field]" />
        </span>
      </template>
    </DsfrSelect>
  </div>
</template>

<style scoped>
.hosting-filters {
  display: flex;
  flex-direction: column;
}

.content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 250px;
}

:deep(.fr-checkbox-group input[type="checkbox"] + .fr-label)::before {
  top: 50%;
  transform: translateY(-50%);
}
</style>
