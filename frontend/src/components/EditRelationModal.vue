<script setup lang="ts">
import type { ApplicationDto, RelationDto } from "@/client/types.gen";
import { RelationType } from "@/client/types.gen";
import { useApplicationSearch } from "@/composables/use-application-search";
import type { RelationUpdate } from "@/composables/use-relation-manager";
import { MIN_CHAR_FOR_SEARCH } from "@/constants/min-char-for-search";
import { RELATION_TYPE_FILTERS } from "@/types/relation-type-filter";
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    opened?: boolean;
    title: string;
    relation: RelationDto | null;
  }>(),
  {
    opened: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "updateRelation", updatedRelation: RelationUpdate): void;
}>();
const { searchApplications } = useApplicationSearch();
const suggestions = ref<ApplicationDto[]>([]);
const selectedApplication = ref<Required<Pick<ApplicationDto, "id" | "label">> | null>(null);
const relationTypeSelected = ref<RelationType>(RelationType.IS_PART_OF);
const selectedMediationService = ref<Required<Pick<ApplicationDto, "id" | "label">> | null>(null);

watch(
  () => props.relation,
  (newRelation) => {
    if (newRelation) {
      selectedApplication.value = newRelation.targetApplication ?? null;
      relationTypeSelected.value = newRelation.type ?? RelationType.IS_PART_OF;
      selectedMediationService.value = newRelation.mediationService ?? null;
    }
  },
  { immediate: true },
);

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

function selectApplication(app?: Pick<ApplicationDto, "id" | "label">) {
  if (app) {
    selectedApplication.value = app;
  }
  suggestions.value = [];
}

function updateMediationServiceId(application: Pick<ApplicationDto, "label" | "id"> | null) {
  selectedMediationService.value = application;
}

function submitRelationUpdate() {
  if (!selectedApplication.value) {
    errorMessage.value = "L'application cible est requise.";
    return;
  }
  if (!relationTypeSelected.value) {
    errorMessage.value = "Le type de relation est requis.";
    return;
  }
  if (!props.relation) {
    errorMessage.value = "La relation à mettre à jour est introuvable.";
    return;
  }

  emit("updateRelation", {
    id: props.relation.id,
    applicationSourceId: props.relation.applicationSourceId,
    type: relationTypeSelected.value,
    mediationServiceId: selectedMediationService.value?.id || null,
    applicationTargetId: selectedApplication.value.id,
  });
  closeModal();
}

function closeModal() {
  emit("close");
}
</script>

<template>
  <DsfrModal :opened="props.opened" :title="props.title" data-testid="edit-relation-modal" @close="closeModal">
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
          v-model="relationTypeSelected"
          :options="relationTypesForSelect"
          label="Type de relation"
          default-unselected-text="Sélectionner une option"
          data-testid="edit-relation-type-select"
        />
      </div>
      <SuggestionsInput
        @update:selected-value="selectApplication"
        :search-data-function="performSearch"
        label="Rechercher une application"
        placeholder="Tapez au moins 3 caractères"
        data-testid="relation-suggestions-input"
      >
        <template v-slot:application-label>
          <DsfrTag v-if="selectedApplication?.label" :label="selectedApplication.label" :small="false" style="margin-top: 15px" />
        </template>
      </SuggestionsInput>
      <SuggestionsInput
        @update:selected-value="($event) => updateMediationServiceId($event ?? null)"
        :search-data-function="performSearch"
        label="Rechercher une application de mediation service (optionnel)"
        placeholder="Tapez au moins 3 caractères"
        data-testid="relation-suggestions-mediation-service-input"
      >
        <template v-slot:application-label>
          <DsfrTag
            v-if="selectedMediationService?.label"
            :label="selectedMediationService.label"
            :value="selectedMediationService.label"
            :selected="false"
            selectable
            style="margin-top: 15px"
            @select="updateMediationServiceId(null)"
            class="fr-tag--dismiss"
          />
        </template>
      </SuggestionsInput>
    </template>
    <template #footer>
      <DsfrButton label="Enregistrer" data-testid="edit-relation-save-btn" @click="submitRelationUpdate" />
      <DsfrButton label="Annuler" secondary data-testid="edit-relation-cancel-btn" @click="closeModal" />
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
