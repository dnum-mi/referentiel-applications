<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import SuggestionsInput from "@/components/SuggestionsInput.vue";

const searchStore = useApplicationSearchStore();
const organizationStore = useOrganizationStore();

const selectedOrganizationId = ref("");

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

const selectedOrganization = computed(() => organizationStore.organizations.find((o) => o.id === selectedOrganizationId.value));

onMounted(async () => {
  await organizationStore.fetchAll();

  // Restaurer l'organisation à partir du filtre déjà présent (label)
  const currentLabel = searchStore.filters.organizationLabel;
  if (currentLabel) {
    const match = organizationStore.organizations.find((o) => o.label === currentLabel);
    if (match) {
      selectedOrganizationId.value = match.id;
    }
  }
});

function onOrganizationUpdate(id: string) {
  selectedOrganizationId.value = id;
  const selected = organizationStore.organizations.find((o) => o.id === id);
  if (selected) {
    searchStore.setFilter("organizationLabel", selected.label);
    debouncedSearch();
  }
}

function clearOrganization() {
  selectedOrganizationId.value = "";
  searchStore.setFilter("organizationLabel", null);
  debouncedSearch();
}
</script>

<template>
  <div class="filter-section">
    <h4>Organisation</h4>

    <SuggestionsInput
      :returnData="selectedOrganizationId"
      @update:returnData="onOrganizationUpdate"
      :searchData="organizationStore.organizations"
      label="Nom de l’organisation"
    />

    <div v-if="selectedOrganization" class="selected-tag">
      <span class="tag-label">{{ selectedOrganization.label }}</span>
      <button class="tag-remove" @click="clearOrganization" title="Retirer ce filtre">×</button>
    </div>
  </div>
</template>

<style scoped>
.filter-section {
  margin-bottom: 2rem;
}

.selected-tag {
  margin-top: 0.5rem;
  background: #e5e5e5;
  padding: 0.3rem 0.6rem;
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
}

.tag-label {
  margin-right: 0.5rem;
}

.tag-remove {
  background: transparent;
  border: none;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  color: #555;
}
.tag-remove:hover {
  color: #d60000;
}
</style>
