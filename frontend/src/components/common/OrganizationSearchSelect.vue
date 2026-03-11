<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { PropType } from "vue";
import type { OrganizationDto } from "@/client/types.gen";
import { useOrganizationStore } from "@/stores/organizationStore";
import { MIN_CHAR_FOR_SEARCH } from "@/constants/min-char-for-search";

const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  initialOrganization: {
    type: Object as PropType<OrganizationDto | null>,
    default: null,
  },
  required: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: "",
  },
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const organizationStore = useOrganizationStore();

const searchQuery = ref("");
const organizations = ref<OrganizationDto[]>([]);
const isLoading = ref(false);
const selectedOrganizationId = ref(props.modelValue);

// Computed label for the search input with asterisk if required
const searchLabel = computed(() => {
  return props.required ? "Organisation *" : "Organisation";
});

// Set initial search query to show selected organization name when editing
if (props.initialOrganization) {
  searchQuery.value = props.initialOrganization.path;
}

// Computed options for the select
const selectOptions = computed(() => {
  const options = [];

  // Always allow empty option
  options.push({
    text: "",
    value: "",
  });

  // Add initial organization if it exists and is not already in the search results
  if (props.initialOrganization && !organizations.value.find((org) => org.id === props.initialOrganization?.id)) {
    options.push({
      text: props.initialOrganization.path,
      value: props.initialOrganization.id,
    });
  }

  organizations.value.forEach((org) => {
    options.push({
      text: org.path,
      value: org.id,
    });
  });

  return options;
});

// Watch for external model value changes
watch(
  () => props.modelValue,
  (newValue) => {
    selectedOrganizationId.value = newValue;
  },
);

// Watch for internal selection changes
watch(selectedOrganizationId, (newValue) => {
  emit("update:modelValue", newValue);

  // Update search query to show selected organization name
  if (newValue) {
    const selectedOrg = selectOptions.value.find((option) => option.value === newValue);
    if (selectedOrg && selectedOrg.text) {
      searchQuery.value = selectedOrg.text;
    }
  }
});

// Search organizations
async function searchOrganizations() {
  if (!searchQuery.value || searchQuery.value.length < MIN_CHAR_FOR_SEARCH) {
    organizations.value = [];
    return;
  }

  try {
    isLoading.value = true;
    const results = await organizationStore.find(searchQuery.value);
    organizations.value = results;
  } catch (error) {
    console.error("Error searching organizations:", error);
    organizations.value = [];
  } finally {
    isLoading.value = false;
  }
}

function clearSearch() {
  searchQuery.value = "";
  organizations.value = [];
  selectedOrganizationId.value = "";
}

watchDebounced(searchQuery, searchOrganizations, { debounce: 300 });
</script>

<template>
  <div>
    <div class="fr-form-group">
      <DsfrInputGroup
        v-model.trim="searchQuery"
        :label="searchLabel"
        placeholder="Rechercher une organisation..."
        :description="description"
        :error-message="errorMessage"
        label-visible
      >
        <template v-if="searchQuery" #append>
          <DsfrButton label="Effacer" size="sm" tertiary no-outline @click="clearSearch" />
        </template>
      </DsfrInputGroup>
    </div>

    <div v-if="selectOptions.length > 0" class="fr-mt-1w">
      <DsfrSelect v-model="selectedOrganizationId" :options="selectOptions" :disabled="isLoading" :label-visible="false" />
    </div>

    <div v-if="searchQuery && !isLoading && organizations.length > 0" class="fr-mt-1w">
      <p class="fr-text--xs fr-text--mention-grey">
        {{ organizations.length }} résultat{{ organizations.length > 1 ? "s" : "" }} trouvé{{ organizations.length > 1 ? "s" : "" }}
      </p>
    </div>

    <div v-if="isLoading" class="fr-mt-1w">
      <p class="fr-text--sm">Recherche en cours...</p>
    </div>

    <div v-else-if="searchQuery && organizations.length === 0" class="fr-mt-1w">
      <p class="fr-text--xs fr-text--mention-grey">Aucune organisation trouvée</p>
    </div>
  </div>
</template>
