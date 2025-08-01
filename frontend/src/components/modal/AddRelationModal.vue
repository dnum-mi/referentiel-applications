<script setup lang="ts">
import { ref } from "vue";
import Applications from "@/api/application";
import useToaster from "@/composables/use-toaster";
import SuggestionsInput from "../SuggestionsInput.vue";

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
  (e: "add-relation", payload: { targetId: string, type: string }): void
}>();
const toaster = useToaster();
const selectedApplicationId = ref<string | null>(null);
const relationType = ref("is_part_of");
const relationTypesForSelect = [
  { value: "is_part_of", text: "Fait partie de" },
  { value: "in_replacement_of", text: "Remplace" },
  { value: "is_service_user_of", text: "Utilise le service de" },
  { value: "is_data_user_of", text: "Utilise la donnée de" },
];

const isLoading = ref(false);

async function performSearch(query: string) {
  if (query && query.length >= 3) {
    isLoading!.value = true;
    try {
      const response = await Applications.getAllApplicationBySearch(query);
      return response.results;
    } catch (error) {
      console.error(error);
      toaster.addErrorMessage("Erreur lors de la recherche d'applications.");
      return [];
    } finally {
      isLoading.value = false;
    }
  }
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
    emit("add-relation", {
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
  <DsfrModal :opened="props.opened" :title="props.title" @close="closeModal">
    <template #default>
      <div class="relation-type">
        <DsfrSelect
          v-model="relationType"
          :options="relationTypesForSelect"
          label="Type de relation"
          default-unselected-text="Sélectionner une option"
        />
      </div>

      <SuggestionsInput
        v-model:return-data="selectedApplicationId"
        :search-data-function="performSearch"
        label="Rechercher une application"
        placeholder="Tapez au moins 3 caractères"
      />
    </template>

    <template #footer>
      <DsfrButton label="Sauvegarder" @click="submitRelation" />
      <DsfrButton label="Annuler" secondary @click="closeModal" />
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
