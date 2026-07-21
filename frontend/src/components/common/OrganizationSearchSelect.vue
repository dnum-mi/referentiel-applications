<script setup lang="ts">
import { ref, computed, watch, useId } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { PropType } from "vue";
import type { OrganizationDto } from "@/client/types.gen";
import { useOrganizationStore } from "@/stores/organizationStore";
import { MIN_CHAR_FOR_SEARCH } from "@/constants/min-char-for-search";

const props = defineProps({
  modelValue: {
    // Nullable : les DTO d'API modélisent « aucune organisation » par null.
    type: [String, null] as unknown as () => string | null,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: null,
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

// RGAA-039 (11.5) : regrouper le champ de recherche et le select de résultats (même nature).
const groupLabelId = useId();

const searchQuery = ref("");
const organizations = ref<OrganizationDto[]>([]);
const isLoading = ref(false);
const selectedOrganizationId = ref(props.modelValue ?? "");

// Computed label for the search input with asterisk if required
const searchLabel = computed(() => {
  const label = props.label?.trim();
  if (label) return label;
  return props.required ? "Organisation *" : "Organisation";
});

// RGAA-040 / RGAA-058 / RGAA-087 (7.5) : message de statut unique restitué aux TA
// via une région live (nombre de suggestions / recherche en cours / absence de résultat).
const searchStatus = computed(() => {
  if (!searchQuery.value) return "";
  if (isLoading.value) return "Recherche en cours…";
  const n = organizations.value.length;
  if (n === 0) return "Aucune organisation trouvée";
  return `${n} résultat${n > 1 ? "s" : ""} trouvé${n > 1 ? "s" : ""}`;
});

// Computed options for the select
const selectOptions = computed(() => {
  const options = [];

  // Always allow empty option
  options.push({
    text: "",
    value: "",
  });

  // Add initial organization if it exists and is not already in the search results
  if (props.initialOrganization && !organizations.value.some((org) => org.id === props.initialOrganization?.id)) {
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
    selectedOrganizationId.value = newValue ?? "";
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
  <div role="group" :aria-labelledby="groupLabelId">
    <p :id="groupLabelId" class="fr-sr-only">{{ searchLabel }}</p>
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
      <DsfrSelect
        v-model="selectedOrganizationId"
        :options="selectOptions"
        :disabled="isLoading"
        label="Choisir une organisation de votre choix"
        label-visible
      />
    </div>

    <div class="fr-mt-1w" aria-live="polite" aria-atomic="true" data-testid="org-search-status">
      <p v-if="searchStatus" class="fr-text--xs fr-text--mention-grey">{{ searchStatus }}</p>
    </div>
  </div>
</template>
