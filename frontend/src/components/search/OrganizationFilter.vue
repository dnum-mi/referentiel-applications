<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import { DsfrInput } from "@gouvminint/vue-dsfr";

const searchStore = useApplicationSearchStore();
const organizationStore = useOrganizationStore();

const organizationSearchInput = ref(searchStore.filters.organizationLabel || "");

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

onMounted(() => {
  organizationStore.fetchAll();
});

watch(organizationSearchInput, (value: string) => {
  searchStore.setFilter("organizationLabel", value);
  searchStore.setFilter("page", 0);
  debouncedSearch();
});

watch(
  searchStore.filters,
  () => {
    organizationSearchInput.value = searchStore.filters.organizationLabel;
  },
  { deep: true },
);
</script>

<template>
  <div class="filter-section">
    <DsfrInput
      label-visible
      label="Nom de l'organisation"
      v-model="organizationSearchInput"
      list="organizationSuggestionsList"
      placeholder="Rechercher une organisation"
    />
    <datalist id="organizationSuggestionsList">
      <option v-for="organization in organizationStore.organizations" :key="organization.id" :value="organization.label">
        {{ organization.label }}
      </option>
    </datalist>
  </div>
</template>
