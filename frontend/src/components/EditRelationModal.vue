<script setup lang="ts">
import { ref, watch } from "vue";
import Applications from "@/api/application";
import Relations from "@/api/relation";
import useToaster from "@/composables/use-toaster";
import type { Relation, Application } from "@/models/Application";

const props = withDefaults(
  defineProps<{
    opened?: boolean;
    title: string;
    relation: Relation | null;
  }>(),
  {
    opened: false,
  },
);

const toaster = useToaster();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "update-relation", updatedRelation: Relation): void;
}>();

const searchText = ref("");
const suggestions = ref<Application[]>([]);
const selectedApplication = ref<Application | null>(null);
const relationType = ref("is_part_of");
const relationTypesForSelect = [
  { value: "is_part_of", text: "Fait partie de" },
  { value: "in_replacement_of", text: "Remplace" },
  { value: "is_service_user_of", text: "Utilise le service de" },
  { value: "is_data_user_of", text: "Utilise la donnée de" },
];

const isLoading = ref(false);

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  } as T;
}

const performSearch = async (query: string) => {
  if (query && query.length >= 3) {
    isLoading.value = true;
    try {
      const result = await Applications.getAllApplicationBySearch(query);
      suggestions.value = result.results;
    } catch (error) {
      console.error(error);
      toaster.addErrorMessage("Erreur lors de la recherche d'applications.");
      suggestions.value = [];
    } finally {
      isLoading.value = false;
    }
  } else {
    suggestions.value = [];
  }
};

const debouncedSearch = debounce(performSearch, 300);

watch(searchText, (newVal) => {
  debouncedSearch(newVal);
});

watch(
  () => props.relation,
  (newRelation) => {
    if (newRelation) {
      relationType.value = newRelation.type;
      if (newRelation.targetApplication) {
        selectedApplication.value = {
          id: newRelation.targetApplication.id,
          label: newRelation.targetApplication.label,
        };
        searchText.value = newRelation.targetApplication.label;
      } else {
        selectedApplication.value = null;
        searchText.value = "";
      }
    } else {
      relationType.value = "is_part_of";
      selectedApplication.value = null;
      searchText.value = "";
    }
  },
  { immediate: true },
);

const selectApplication = (app: Application) => {
  selectedApplication.value = app;
  searchText.value = app.label;
  suggestions.value = [];
};

const submitRelationUpdate = async () => {
  if (!selectedApplication.value) {
    toaster.addErrorMessage("L'application cible est requise.");
    return;
  }
  if (!relationType.value) {
    toaster.addErrorMessage("Le type de relation est requis.");
    return;
  }
  if (!props.relation) {
    toaster.addErrorMessage("La relation à mettre à jour est introuvable.");
    return;
  }

  const payload = {
    applicationTargetId: selectedApplication.value.id,
    type: relationType.value,
  };

  try {
    const result = await Relations.update(props.relation.applicationSourceId, props.relation.id, payload);
    emit("update-relation", result);
    closeModal();
  } catch (error) {
    console.error(error);
    toaster.addErrorMessage("Erreur lors de la mise à jour de la relation.");
  }
};

const closeModal = () => {
  emit("close");
};
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
      <DsfrInput label="Rechercher une application" v-model="searchText" placeholder="Tapez au moins 3 caractères" />
      <div v-if="isLoading">Chargement...</div>
      <ul v-if="suggestions.length" class="suggestions-list">
        <li v-for="app in suggestions" :key="app.id" class="suggestion-item">
          <button type="button" @click="selectApplication(app)" class="suggestion-button">
            {{ app.label }}
          </button>
        </li>
      </ul>
    </template>
    <template #footer>
      <DsfrButton label="Sauvegarder" @click="submitRelationUpdate" />
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
