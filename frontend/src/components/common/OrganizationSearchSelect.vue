<script setup lang="ts">
import { ref, computed, watch, useId } from "vue";
import { watchDebounced } from "@vueuse/core";
import type { PropType } from "vue";
import type { OrganizationDto } from "@/client/types.gen";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useAsyncSearch } from "@/composables/use-async-search";

const props = defineProps({
  modelValue: {
    type: String,
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
  inputId: {
    type: String,
    default: "",
  },
  selectId: {
    type: String,
    default: "",
  },
  descriptionId: {
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
const container = ref<HTMLElement | null>(null);
const searchInputId = computed(() => props.inputId || `${groupLabelId}-search`);
const organizationSelectId = computed(() => props.selectId || `${groupLabelId}-select`);
const errorId = computed(() => props.descriptionId || `${groupLabelId}-error`);

function focus() {
  const target =
    container.value?.querySelector<HTMLElement>("select:not(:disabled)") ?? container.value?.querySelector<HTMLInputElement>("input");
  target?.focus();
}

defineExpose({ focus });

const searchQuery = ref("");
const {
  results: organizations,
  isLoading,
  error: searchError,
  onQuery,
  reset,
} = useAsyncSearch((query) => organizationStore.find(query), {
  errorMessage: "Erreur lors de la recherche d'organisations.",
});
const selectedOrganizationId = ref(props.modelValue);

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
  if (searchError.value) return searchError.value;
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

  // Conserver la sélection pendant l'invalidation ou le chargement d'une autre recherche.
  const selectedOrganization = organizationStore.organizations[selectedOrganizationId.value] ?? props.initialOrganization;
  if (selectedOrganization && !organizations.value.some((org) => org.id === selectedOrganization.id)) {
    options.push({
      text: selectedOrganization.path,
      value: selectedOrganization.id,
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

function clearSearch() {
  searchQuery.value = "";
  reset();
  selectedOrganizationId.value = "";
}

watch(searchQuery, () => reset(), { flush: "sync" });
watchDebounced(searchQuery, onQuery, { debounce: 300 });
</script>

<template>
  <div ref="container" role="group" :aria-labelledby="groupLabelId">
    <p :id="groupLabelId" class="fr-sr-only">{{ searchLabel }}</p>
    <div class="fr-form-group">
      <DsfrInputGroup
        :id="searchInputId"
        v-model.trim="searchQuery"
        :label="searchLabel"
        placeholder="Rechercher une organisation..."
        :description="description"
        :error-message="errorMessage"
        :description-id="errorId"
        :aria-invalid="errorMessage ? true : undefined"
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
        :select-id="organizationSelectId"
        :options="selectOptions"
        :disabled="isLoading"
        :aria-describedby="errorMessage ? errorId : undefined"
        :aria-invalid="errorMessage ? true : undefined"
        :aria-required="required || undefined"
        label="Choisir une organisation de votre choix"
        label-visible
      />
    </div>

    <div class="fr-mt-1w" aria-live="polite" aria-atomic="true" data-testid="org-search-status">
      <p v-if="searchStatus" class="fr-text--xs fr-text--mention-grey">{{ searchStatus }}</p>
    </div>
  </div>
</template>
