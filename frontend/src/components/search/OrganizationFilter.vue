<script setup lang="ts">
import { ref, computed } from "vue";
import { useOrganizationStore } from "@/stores/organizationStore";
import { DsfrInput } from "@gouvminint/vue-dsfr";
import type { OrganizationDto } from "@/client/types.gen";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";

const searchStore = useApplicationSearchStore();
const organizationStore = useOrganizationStore();

const organizationSearchInput = computed(() => searchStore.filters.organizationLabel);
const organizations = ref<OrganizationDto[]>([]);

function updateOrganizationFilter(value?: string) {
  searchStore.setFilter({ organizationLabel: value, page: 0 });
}

watch(organizationSearchInput, async (val) => {
  organizations.value = await organizationStore.find(val);
}, { immediate: true });
</script>

<template>
  <DsfrInput
    v-model="organizationSearchInput"
    label-visible
    label="Nom de l'organisation"
    list="organizationSuggestionsList"
    placeholder="Rechercher une organisation"
    data-testid="organization-filter-input"
    @update:model-value="updateOrganizationFilter"
  />
  <datalist id="organizationSuggestionsList" data-testid="organization-suggestions-list">
    <option v-for="organization in organizations" :key="organization.id" :data-testid="`organization-option-${organization.id}`">
      {{ organization.label }}
    </option>
  </datalist>
</template>
