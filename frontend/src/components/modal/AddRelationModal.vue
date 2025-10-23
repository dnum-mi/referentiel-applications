<script setup lang="ts">
import { ref } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import SuggestionsInput from "../SuggestionsInput.vue";
import { RelationType } from "@/client/types.gen";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore.js";

const props = withDefaults(
  defineProps<{
    opened?: boolean
    title: string
    applicationId: string
  }>(),
  {
    opened: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void
  (e: "addRelation", payload: { targetId: string, type: string }): void
}>();
const toaster = useToasterStore();
const applicationSearchStore = useApplicationSearchStore();
const selectedApplicationId = ref<string>("");
const relationType = ref<RelationType>(RelationType.IS_PART_OF);
const relationTypesForSelect = [
  { value: RelationType.IS_PART_OF, text: "Fait partie de" },
  { value: RelationType.IN_REPLACEMENT_OF, text: "Remplace" },
  { value: RelationType.IS_SERVICE_USER_OF, text: "Utilise le service de" },
  { value: RelationType.IS_DATA_USER_OF, text: "Utilise la donnée de" },
];

const isLoading = ref(false);

async function performSearch(query: string) {
  if (query && query.length >= 3) {
    isLoading!.value = true;
    try {
      const response = await applicationSearchStore.searchApplications({ search: query, pageSize: 10 }, false);
      return response.results;
    } catch (error) {
      console.error(error);
      toaster.addErrorMessage("Erreur lors de la recherche d'applications.");
      return [];
    } finally {
      isLoading.value = false;
    }
  }
  return [];
}

async function submitRelation() {
  if (!selectedApplicationId.value) {
    toaster.addErrorMessage("L'application cible est requise.");
    return;
  }
  if (!relationType.value) {
    toaster.addErrorMessage("Le type de relation est requis.");
    return;
  }
  const applicationSourceId = props.applicationId;
  if (!applicationSourceId) {
    toaster.addErrorMessage("L'application source est introuvable.");
    return;
  }

  try {
    emit("addRelation", {
      targetId: selectedApplicationId.value,
      type: relationType.value,
    });
    closeModal();
  } catch (error) {
    console.error(error);
  }
}

function closeModal() {
  emit("close");
}
</script>

<template>
  <DsfrModal :opened="props.opened" :title="props.title" data-testid="relation-modal" @close="closeModal">
    <template #default>
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
        v-model:return-data="selectedApplicationId"
        :search-data-function="performSearch"
        label="Rechercher une application"
        placeholder="Tapez au moins 3 caractères"
        data-testid="relation-suggestions-input"
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
