<script setup lang="ts">
import { ref, watch, defineEmits } from "vue";
import { useOrganizationStore } from "@/stores/organizationStore";
import { DsfrInput } from "@gouvminint/vue-dsfr";
import type { Organization } from "@/models/organization";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";

const props = withDefaults(
  defineProps<{
    preselected?: Organization | undefined | null
  }>(),
  {
    preselected: null,
  },
);

const emits = defineEmits<{
  select: [value: Organization | null]
}>();

const searchStore = useApplicationSearchStore();
const organizationStore = useOrganizationStore();
const organizationSearchInput = ref("");
const suggestions = ref<Organization[]>([]);
const selected = ref<Organization | null>(props.preselected);

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

if (props.preselected) {
  select(props.preselected);
}

watch(organizationSearchInput, (value: string) => {
  if (value.length >= 3) {
    organizationStore
      .search(value)
      .then((data) => {
        suggestions.value = data;
      })
      .catch((error) => {
        console.error("Error fetching organization suggestions:", error);
      });
  } else {
    suggestions.value = [];
  }
});

function select(org: Organization) {
  selected.value = org;
  organizationSearchInput.value = selected.value.label;
  searchStore.setFilter("organizationLabel", organizationSearchInput.value);
  searchStore.setFilter("page", 0);
  debouncedSearch();
  emits("select", selected.value);
}
function reset() {
  selected.value = null;
  organizationSearchInput.value = "";
  searchStore.resetFilters();
  emits("select", selected.value);
}
function update() {
  if (organizationSearchInput.value !== selected.value?.label) {
    selected.value = null;
    searchStore.resetFilters();
  }
}
</script>

<template>
  <div class="filter-section">
    <div class="search-section">
      <div class="input-field">
        <DsfrInput
          v-model="organizationSearchInput"
          label-visible
          label="Nom de l'organisation"
          list="organizationSuggestionsList"
          placeholder="Rechercher une organisation"
          @update:model-value="update"
        />
      </div>
      <DsfrButton v-if="selected" class="cancel-button" secondary label="X" @click="reset" />
    </div>
    <template v-if="!selected">
      <div v-for="organization in suggestions" :key="organization.id" @click="select(organization)">
        <OrgBreadCrumb hide-hierarchy :organization-id="organization.id" :clickable="false" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.search-section {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: space-between;
  align-content: space-between;
}

.input-field {
  flex: 1;
}

.cancel-button {
  flex: 0;
  align-self: end;
}
</style>
