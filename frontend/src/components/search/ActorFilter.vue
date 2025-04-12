<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import SuggestionsInput from "@/components/SuggestionsInput.vue";

const searchStore = useApplicationSearchStore();
const actorTypeStore = useActorTypeStore();

const selectedActorTypeId = ref("");

const { run: debouncedSearch } = useDebouncedFn(() => {
  searchStore.searchApplications();
}, 300);

const selectedActor = computed(() => actorTypeStore.actorTypes.find((a) => a.id === selectedActorTypeId.value));

onMounted(() => {
  actorTypeStore.fetchAll();

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
    searchStore.setFilter("page", 0);
    debouncedSearch();
  }
}

function clearActorType() {
  selectedActorTypeId.value = "";
  searchStore.setFilter("actorType", null);
  searchStore.setFilter("page", 0);
  debouncedSearch();
}
</script>

<template>
  <div class="filter-section">
    <SuggestionsInput
      :returnData="selectedActorTypeId"
      @update:returnData="onActorTypeUpdate"
      :searchData="actorTypeStore.actorTypes"
      label="Type d'acteur"
    />

    <div v-if="selectedActor" class="selected-tag">
      <span class="tag-label">{{ selectedActor.label }}</span>
      <button class="tag-remove" @click="clearActorType" title="Retirer ce filtre">×</button>
    </div>
  </div>
</template>

<style scoped>
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
