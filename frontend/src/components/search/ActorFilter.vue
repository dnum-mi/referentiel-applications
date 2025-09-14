<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";

const searchStore = useApplicationSearchStore();
const actorTypeStore = useActorTypeStore();

const selectedActorTypeId = ref("");

const actorTypeOptions = computed(() =>
  [{
    text: "Tous",
    value: "",
  }, ...actorTypeStore.actorTypes.map(actor => ({
    text: actor.label,
    value: actor.id,
  }))],
);

onMounted(async () => {
  await actorTypeStore.fetchAll();
  const currentCode = searchStore.filters.actorType;
  if (currentCode) {
    const match = actorTypeStore.actorTypes.find(actor => actor.code === currentCode);
    if (match) {
      selectedActorTypeId.value = match.id;
    }
  }
});

watch(selectedActorTypeId, (newVal) => {
  if (newVal) {
    const selected = actorTypeStore.actorTypes.find(actor => actor.id === newVal);
    if (selected) {
      searchStore.setFilter({
        actorType: selected.code,
        page: 0,
      });
    }
    return;
  }
  searchStore.setFilter({
    actorType: undefined,
    page: 0,
  });
});

watch(
  () => searchStore.filters.actorType,
  (val) => {
    const match = actorTypeStore.actorTypes.find(actor => actor.code === val);
    selectedActorTypeId.value = match?.id ?? "";
  },
  { deep: true },
);
</script>

<template>
  <div class="filter-section">
    <DsfrSelect v-model="selectedActorTypeId" :options="actorTypeOptions" label="Type d'acteur" data-testid="actor-filter-select" />
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
