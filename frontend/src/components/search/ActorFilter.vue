<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import SuggestionsInput from "@/components/SuggestionsInput.vue";

const searchStore = useApplicationSearchStore();
const actorTypeStore = useActorTypeStore();

// ID de l’acteur sélectionné (lié à l’input)
const selectedActorTypeId = ref("");

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

// 🎯 Récupérer l'objet complet depuis l’ID sélectionné
const selectedActor = computed(() => actorTypeStore.actorTypes.find((a) => a.id === selectedActorTypeId.value));

onMounted(() => {
  actorTypeStore.fetchAll();

  // Restaurer si un filtre par code est déjà présent
  const currentCode = searchStore.filters.actorType;
  if (currentCode) {
    const match = actorTypeStore.actorTypes.find((a) => a.code === currentCode);
    if (match) {
      selectedActorTypeId.value = match.id;
    }
  }
});

function onActorTypeUpdate(id: string) {
  selectedActorTypeId.value = id;
  const selected = actorTypeStore.actorTypes.find((a) => a.id === id);
  if (selected) {
    searchStore.setFilter("actorType", selected.code);
    debouncedSearch();
  }
}

function clearActorType() {
  selectedActorTypeId.value = "";
  searchStore.setFilter("actorType", null);
  debouncedSearch();
}
</script>

<template>
  <div class="filter-section">
    <h4>Type d'acteur</h4>

    <SuggestionsInput
      :returnData="selectedActorTypeId"
      @update:returnData="onActorTypeUpdate"
      :searchData="actorTypeStore.actorTypes"
      label="Type d'acteur"
    />

    <!-- 🎯 Affichage du tag avec bouton pour enlever -->
    <div v-if="selectedActor" class="selected-tag">
      <span class="tag-label">{{ selectedActor.label }}</span>
      <button class="tag-remove" @click="clearActorType" title="Retirer ce filtre">×</button>
    </div>
  </div>
</template>

<style scoped>
.filter-section {
  margin-bottom: 2rem;
}

.selected-tag {
  margin-top: 0.5rem;
  background: #e5e5e5;
  padding: 0.3rem 0.6rem;
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
}

.tag-label {
  margin-right: 0.5rem;
}

.tag-remove {
  background: transparent;
  border: none;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  color: #555;
}
.tag-remove:hover {
  color: #d60000;
}
</style>
