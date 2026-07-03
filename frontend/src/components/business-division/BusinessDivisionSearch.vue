<script lang="ts" setup>
import { watch } from "vue";
import api from "@/api";
import type { BusinessDivisionDto } from "@/client";
import { MIN_CHAR_FOR_SEARCH } from "@/constants/min-char-for-search";

const props = withDefaults(
  defineProps<{
    businessDivisionId?: BusinessDivisionDto["id"] | null;
    label?: string;
    tooltipContent?: string;
  }>(),
  {
    label: "",
    tooltipContent: undefined,
  },
);

const emit = defineEmits<{
  (e: "update", payload: BusinessDivisionDto | null): void;
}>();

const businessDivision = ref<null | BusinessDivisionDto>(null);
const isLoading = ref(false);
const errorMessage = ref("");
const selectedValue = ref<null | BusinessDivisionDto>(null);

const defaultLabel = computed(() => {
  return businessDivision.value ? businessDivision.value?.label : undefined;
});

watch(
  () => props.businessDivisionId,
  async (businessDivisionId) => {
    if (businessDivisionId) {
      const { data } = await api.businessDivisionControllerFindById({ path: { id: businessDivisionId } });
      if (data) {
        businessDivision.value = data;
      }
    }
  },
  { immediate: true },
);

const updateSelectedValue = (businessDivision?: BusinessDivisionDto) => {
  selectedValue.value = businessDivision ?? null;
  emit("update", selectedValue.value);
};

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
      @update:selected-value="updateSelectedValue"
      :search-data-function="performSearch"
      :default-value="defaultLabel"
      :label="props.label"
      :tooltip-content="props.tooltipContent"
      placeholder="Tapez au moins 3 caractères"
      data-testid="business-division-suggestions-input"
    />
  </div>
</template>

<style scoped>
.business-relation-filters {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 1.5rem;
}
</style>
