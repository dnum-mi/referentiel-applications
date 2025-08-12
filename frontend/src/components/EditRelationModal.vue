<script setup lang="ts">
import { ref, watch } from "vue";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api/index";
import { RelationType } from "@/client/types.gen";
import type { ApplicationDto, RelationDto } from "@/client/types.gen";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore.js";

const props = withDefaults(
  defineProps<{
    opened?: boolean
    title: string
    relation: RelationDto | null
  }>(),
  {
    opened: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void
  (e: "update-relation", updatedRelation: RelationDto): void
}>();
const toaster = useToasterStore();
const applicationSearchStore = useApplicationSearchStore();
const searchText = ref("");
const suggestions = ref<ApplicationDto[]>([]);
const selectedApplication = ref<Required<Pick<ApplicationDto, "id" | "label">> | null>(null);
const relationTypeSelected = ref<RelationType>(RelationType.IS_PART_OF);
const relationTypesForSelect = [
  { value: RelationType.IS_PART_OF, text: "Fait partie de" },
  { value: RelationType.IN_REPLACEMENT_OF, text: "Remplace" },
  { value: RelationType.IS_SERVICE_USER_OF, text: "Utilise le service de" },
  { value: RelationType.IS_DATA_USER_OF, text: "Utilise la donnée de" },
];

const isLoading = ref(false);

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  } as T;
}

async function performSearch(query: string) {
  if (query && query.length >= 3) {
    isLoading.value = true;
    try {
      const response = await applicationSearchStore.searchApplications({
        search: query,
        limit: 10,
      }, false);
      suggestions.value = response.results || [];
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
}

const debouncedSearch = debounce(performSearch, 300);

watch(searchText, (newVal) => {
  debouncedSearch(newVal);
});

watch(
  () => props.relation,
  (newRelation) => {
    if (newRelation) {
      relationTypeSelected.value = newRelation.type;
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
      relationTypeSelected.value = RelationType.IS_PART_OF;
      selectedApplication.value = null;
      searchText.value = "";
    }
  },
  { immediate: true },
);

function selectApplication(app: ApplicationDto) {
  selectedApplication.value = app;
  searchText.value = app.label;
  suggestions.value = [];
}

async function submitRelationUpdate() {
  if (!selectedApplication.value) {
    toaster.addErrorMessage("L'application cible est requise.");
    return;
  }
  if (!relationTypeSelected.value) {
    toaster.addErrorMessage("Le type de relation est requis.");
    return;
  }
  if (!props.relation) {
    toaster.addErrorMessage("La relation à mettre à jour est introuvable.");
    return;
  }

  const payload = {
    applicationTargetId: selectedApplication.value.id,
    type: relationTypeSelected.value,
  };

  const response = await api.relationControllerUpdate({
    path: { applicationId: props.relation.applicationSourceId, id: props.relation.id },
    body: payload,
  });
  if (response.error) {
    console.error(response.error);
    toaster.addErrorMessage("Erreur lors de la mise à jour de la relation.");
    return;
  }
  if (!response.response.ok) {
    toaster.addErrorMessage("Erreur lors de la mise à jour de la relation.");
    return;
  }
  if (response.data) {
    const result = response.data;

    emit("update-relation", result);
    closeModal();
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
          v-model="relationTypeSelected"
          :options="relationTypesForSelect"
          label="Type de relation"
          default-unselected-text="Sélectionner une option"
        />
      </div>
      <DsfrInput v-model="searchText" label="Rechercher une application" placeholder="Tapez au moins 3 caractères" />
      <div v-if="isLoading">
        Chargement...
      </div>
      <ul v-if="suggestions.length" class="suggestions-list">
        <li v-for="app in suggestions" :key="app.id" class="suggestion-item">
          <button type="button" class="suggestion-button" @click="selectApplication(app)">
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
