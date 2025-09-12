<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useOrganizationStore } from "@/stores/organizationStore";
import { DsfrInput } from "@gouvminint/vue-dsfr";
import type { OrganizationDto } from "@/client/types.gen";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";

const searchStore = useApplicationSearchStore();
const organizationStore = useOrganizationStore();

const organizationSearchInput = ref(searchStore.filters.organizationLabel);
const organizations = ref<OrganizationDto[]>([]);

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

onMounted(async () => {
  organizations.value = await organizationStore.find();
});

watch(organizationSearchInput, (value?: string) => {
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
  <DsfrInput
    v-model="organizationSearchInput"
    label-visible
    label="Nom de l'organisation"
    list="organizationSuggestionsList"
    placeholder="Rechercher une organisation"
    data-testid="organization-filter-input"
  />
  <datalist id="organizationSuggestionsList" data-testid="organization-suggestions-list">
    <option v-for="organization in organizations" :key="organization.id" :data-testid="`organization-option-${organization.id}`">
      {{ organization.label }}
    </option>
  </datalist>
</template>
