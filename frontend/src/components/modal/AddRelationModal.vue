<script setup lang="ts">
import { ref } from "vue";
import SuggestionsInput from "../SuggestionsInput.vue";
import { RelationType, type ApplicationDto, type RelationDto } from "@/client/types.gen";
import { useApplicationSearch } from "@/composables/use-application-search";
import { RELATION_TYPE_FILTERS } from "@/types/relation-type-filter";
import { MIN_CHAR_FOR_SEARCH } from "@/constants/min-char-for-search";
import type { RelationCreate } from "@/models/relations";

const props = withDefaults(
  defineProps<{
    opened?: boolean;
    title: string;
    applicationId: string;
  }>(),
  {
    opened: false,
  },
);
const emit = defineEmits<{
  (e: "close"): void;
  (e: "addRelation", payload: Omit<RelationCreate, "applicationSourceId">): void;
}>();
const { searchApplications } = useApplicationSearch();
const selectedApplicationId = ref<string>("");
const selectedMediationServiceId = ref<string>("");
const relationType = ref<RelationType>(RelationType.IS_PART_OF);
const relationTypesForSelect = [
  { value: RelationType.IS_PART_OF, text: "Fait partie de" },
  { value: RelationType.IN_REPLACEMENT_OF, text: "Remplace" },
  { value: RelationType.IS_SERVICE_USER_OF, text: "Utilise le service de" },
  { value: RelationType.IS_DATA_USER_OF, text: "Utilise la donnée de" },
  { value: RelationType.USE_SSO_OF, text: "Utilise le SSO de" },
];
const errorMessage = ref<string>("");

const isLoading = ref(false);

async function performSearch(query: string) {
  if (query && query.length >= MIN_CHAR_FOR_SEARCH) {
    isLoading!.value = true;
    try {
      const response = await searchApplications(
        {
          search: query,
          pageSize: 10,
          is_part_of: RELATION_TYPE_FILTERS.neutral,
          is_data_user_of: RELATION_TYPE_FILTERS.neutral,
          is_service_user_of: RELATION_TYPE_FILTERS.neutral,
          in_replacement_of: RELATION_TYPE_FILTERS.neutral,
          use_sso_of: RELATION_TYPE_FILTERS.neutral,
          relationAppId: undefined,
        },
        false,
      );
      return response.results;
    } catch (error) {
      console.error(error);
      errorMessage.value = "Erreur lors de la recherche d'applications.";
      return [];
    } finally {
      isLoading.value = false;
    }
  }
  return [];
}

async function submitRelation() {
  if (!selectedApplicationId.value) {
    errorMessage.value = "L'application cible est requise.";
    return;
  }
  if (!relationType.value) {
    errorMessage.value = "Le type de relation est requis.";
    return;
  }
  const applicationSourceId = props.applicationId;
  if (!applicationSourceId) {
    errorMessage.value = "L'application source est introuvable.";
    return;
  }

  try {
    emit("addRelation", {
      applicationTargetId: selectedApplicationId.value,
      type: relationType.value,
      mediationServiceId: selectedMediationServiceId.value || null,
    });
    closeModal();
  } catch (error) {
    console.error(error);
  }
}

function closeModal() {
  emit("close");
}

function updateSelectedValue(application?: Pick<ApplicationDto, "label" | "id">) {
  selectedApplicationId.value = application?.id ?? "";
}

function updateMediationServiceId(application?: Pick<ApplicationDto, "label" | "id">) {
  selectedMediationServiceId.value = application?.id ?? "";
}
</script>

<template>
  <DsfrModal :opened="props.opened" :title="props.title" data-testid="relation-modal" @close="closeModal">
    <template #default>
      <DsfrAlert
        v-show="errorMessage.length > 0"
        class="mb-4"
        tabindex="-1"
        type="error"
        role="alert"
        aria-live="assertive"
        title="Une erreur est survenue"
        :description="errorMessage"
      />
      <div class="relation-type">
        <DsfrSelect
          v-model="relationType"
          :options="relationTypesForSelect"
          label="Type de relation"
          default-unselected-text="Sélectionner une option"
          data-testid="relation-type-select"
        />
      </div>

      <SuggestionsInput
        @update:selected-value="updateSelectedValue"
        :search-data-function="performSearch"
        label="Rechercher une application"
        placeholder="Tapez au moins 3 caractères"
        data-testid="relation-suggestions-input"
      />

      <SuggestionsInput
        @update:selected-value="updateMediationServiceId"
        :search-data-function="performSearch"
        label="Rechercher une application de mediation service (optionnel)"
        placeholder="Tapez au moins 3 caractères"
        data-testid="relation-suggestions-mediation-service-input"
      />
    </template>

    <template #footer>
      <DsfrButton label="Sauvegarder" data-testid="relation-save-btn" @click="submitRelation" />
      <DsfrButton label="Annuler" secondary data-testid="relation-cancel-btn" @click="closeModal" />
    </template>
  </DsfrModal>
</template>

<style scoped>
.suggestions-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0;
  border: 1px solid #ccc;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 0.5rem;
  cursor: pointer;
}

.suggestion-item:hover {
  background-color: #f0f0f0;
}

.suggestion-button {
  all: unset;
  display: block;
  width: 100%;
  padding: 0.5rem;
  cursor: pointer;
}

.suggestion-button:hover,
.suggestion-button:focus {
  background-color: #f0f0f0;
}

.relation-type {
  margin-top: 1rem;
}
</style>
