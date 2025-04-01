<script setup lang="ts">
import { ref, watch } from "vue";
import Applications from "@/api/application";
import Relations from "@/api/relation";
import useToaster from "@/composables/use-toaster";

interface ApplicationSummary {
  id: string;
  label: string;
}

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

const toaster = useToaster();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "add-relation", payload: { target: ApplicationSummary; relationType: string }): void;
  (e: "update:application", payload: any): void;
}>();

const searchText = ref("");
const suggestions = ref<ApplicationSummary[]>([]);
const selectedApplication = ref<ApplicationSummary | null>(null);
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
      suggestions.value = result;
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

const selectApplication = (app: ApplicationSummary) => {
  selectedApplication.value = app;
  searchText.value = app.label;
  suggestions.value = [];
};

const submitRelation = async () => {
  if (!selectedApplication.value) {
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
    await Relations.create(applicationSourceId, selectedApplication.value.id, relationType.value);
    emit("add-relation", {
      target: selectedApplication.value,
      relationType: relationType.value,
    });
    const fetchApplication = await Applications.getApplicationById(props.applicationId);
    emit("update:application", fetchApplication);
    closeModal();
    toaster.addSuccessMessage("Relation ajoutée avec succès !");
  } catch (error) {
    console.error(error);
    toaster.addErrorMessage("Erreur lors de l'ajout de la relation.");
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
