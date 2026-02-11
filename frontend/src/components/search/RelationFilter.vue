<script lang="ts" setup>
import { watch } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { RelationType, type ApplicationDto } from "@/client";

const { searchApplications, setFilter, filters } = useApplicationSearch();
const isLoading = ref(false);
const errorMessage = ref("");
const componentKey = ref(0);
const defaultValue = ref<undefined | string>(undefined);

async function performSearch(query: string) {
  if (query && query.length >= 3) {
    isLoading.value = true;
    errorMessage.value = "";
    try {
      const response = await searchApplications(
        {
          search: query,
          pageSize: 10,
          is_part_of: "NEUTRAL",
          is_data_user_of: "NEUTRAL",
          is_service_user_of: "NEUTRAL",
          in_replacement_of: "NEUTRAL",
          relationAppId: undefined,
        },
        false,
      );
      return response.results;
    } catch (error) {
      console.error(error);
      errorMessage.value = "Erreur lors de la recherche d'applications.";
      return [];
    } finally {
      isLoading.value = false;
    }
  }
  return [];
}

const updateSelectedValue = (application?: Pick<ApplicationDto, "label" | "id">) => {
  setFilter({
    relationAppId: application?.id,
  });
};

watch([() => filters.value.relationAppId], ([relationAppId]) => {
  if (!relationAppId) {
    componentKey.value++;
  }
});

type RelationField = RelationType;
type FilterKey = RelationType;

const relationFields: { field: RelationField; filterKey: FilterKey; label: string; testId: string }[] = [
  { field: RelationType.IS_PART_OF, filterKey: RelationType.IS_PART_OF, label: "Fait partie de", testId: "relation-is_part_of-select" },
  {
    field: RelationType.IN_REPLACEMENT_OF,
    filterKey: RelationType.IN_REPLACEMENT_OF,
    label: "Remplace",
    testId: "relation-in_replacement_of-select",
  },
  {
    field: RelationType.IS_SERVICE_USER_OF,
    filterKey: RelationType.IS_SERVICE_USER_OF,
    label: "Utilise le service de",
    testId: "relation-is_service_user_of-select",
  },
  {
    field: RelationType.IS_DATA_USER_OF,
    filterKey: RelationType.IS_DATA_USER_OF,
    label: "Utilise la donnée de",
    testId: "relation-is_data_user_of-select",
  },
];

const optionsMap: { text: string; value: "NEUTRAL" | "INCLUDE" | "EXCLUDE" }[] = [
  {
    text: "Neutre",
    value: "NEUTRAL",
  },
  {
    text: "Inclure",
    value: "INCLUDE",
  },
  {
    text: "Exclure",
    value: "EXCLUDE",
  },
];

const updateFilter = (filterKey: RelationType, value: string | number) => {
  if (typeof value === "string" && ["NEUTRAL", "INCLUDE", "EXCLUDE"].includes(value)) {
    setFilter({ [filterKey]: value || undefined });
  }
};

watch(
  () => filters.value.relationAppId,
  async (relationAppId) => {
    if (!relationAppId) return;
    const response = await api.applicationControllerFindOne({
      path: { applicationId: relationAppId },
    });
    if (response.data) {
      defaultValue.value = response.data.label;
    }
  },
  { once: true, immediate: true },
);
</script>

<template>
  <div class="relation-filters">
    <SuggestionsInput
      :key="componentKey"
      @update:selected-value="updateSelectedValue"
      :default-value="defaultValue"
      :search-data-function="performSearch"
      label="Rechercher une application"
      placeholder="Tapez au moins 3 caractères"
      data-testid="relation-suggestions-input"
    />
    <DsfrSelect
      v-for="{ field, filterKey, testId, label } in relationFields"
      :key="field"
      :model-value="filters[filterKey] || 'NEUTRAL'"
      :label="label"
      :options="optionsMap"
      :disabled="isLoading"
      :data-testid="testId"
      @update:model-value="updateFilter(filterKey, $event)"
    />
  </div>
</template>

<style scoped>
.relation-filters {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
</style>
