<script lang="ts" setup>
import { computed, watch } from "vue";
import api from "@/api";
import type { BusinessDivisionDto } from "@/client";
import { MIN_CHAR_FOR_SEARCH } from "@/constants/min-char-for-search";

const props = withDefaults(
  defineProps<{
    businessDivisionIds?: string[];
    label?: string;
    tooltipContent?: string;
  }>(),
  {
    businessDivisionIds: () => [],
    label: "",
    tooltipContent: undefined,
  },
);

const emit = defineEmits<{
  (e: "update:businessDivisionIds", payload: string[]): void;
}>();

const selectedDivisions = ref<BusinessDivisionDto[]>([]);
const isLoading = ref(false);
const errorMessage = ref("");

// Filtre alimenté par l'URL : le prop peut arriver comme une simple chaîne plutôt qu'un tableau
// (deep-link à un seul id), voire comme un tableau dont un élément porte encore plusieurs ids
// joints par une virgule (ex. filtre CSV `id1,id2` pas encore éclaté). On normalise et on
// redécoupe systématiquement, comme `parseQueryParamArray` le fait côté composable de recherche.
const normalizedIds = computed<string[]>(() => {
  const raw = props.businessDivisionIds;
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return values.flatMap((value) => value.split(",")).filter(Boolean);
});

watch(
  normalizedIds,
  async (ids) => {
    const missingIds = ids.filter((id) => !selectedDivisions.value.some((division) => division.id === id));
    const resolved = await Promise.all(
      missingIds.map(async (id) => {
        const { data } = await api.businessDivisionControllerFindById({ path: { id } });
        return data;
      }),
    );
    selectedDivisions.value = ids
      .map((id) => resolved.find((division) => division?.id === id) ?? selectedDivisions.value.find((division) => division.id === id))
      .filter((division): division is BusinessDivisionDto => Boolean(division));
  },
  { immediate: true },
);

function addDivision(division?: BusinessDivisionDto) {
  if (!division || normalizedIds.value.includes(division.id)) return;
  emit("update:businessDivisionIds", [...normalizedIds.value, division.id]);
}

function removeDivision(index: number) {
  emit(
    "update:businessDivisionIds",
    normalizedIds.value.filter((_, i) => i !== index),
  );
}

async function performSearch(query: string) {
  if (query && query.length >= MIN_CHAR_FOR_SEARCH) {
    isLoading.value = true;
    errorMessage.value = "";
    try {
      const { data } = await api.businessDivisionControllerFindAll({
        query: {
          label: query,
          pageSize: 0,
        },
      });
      if (!data || !data.results) {
        errorMessage.value = "Aucun résultat trouvé.";
        return [];
      }
      return data.results;
    } catch (error) {
      console.error(error);
      errorMessage.value = "Erreur lors de la recherche de direction de metier.";
      return [];
    } finally {
      isLoading.value = false;
    }
  }
  return [];
}
</script>

<template>
  <div class="business-relation-filters">
    <SuggestionsInput
      @update:selected-value="addDivision"
      :search-data-function="performSearch"
      :label="props.label"
      :tooltip-content="props.tooltipContent"
      :hide-selected-tag="true"
      placeholder="Tapez au moins 3 caractères"
      data-testid="business-division-suggestions-input"
    />
    <ul v-if="selectedDivisions.length" class="fr-tags-group" data-testid="business-division-tags">
      <li v-for="(division, index) in selectedDivisions" :key="division.id" class="tag-item">
        <DsfrTag
          :label="division.label"
          tag-name="button"
          class="fr-tag--dismiss"
          :aria-label="`Retirer la direction métier : ${division.label}`"
          @click.stop.prevent="removeDivision(index)"
        />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.business-relation-filters {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 1.5rem;
}

.tag-item {
  display: inline-block;
}
</style>
