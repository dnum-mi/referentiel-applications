<script lang="ts" setup>
import api from "@/api";
import { RelationType, type ApplicationDto } from "@/client";
import { useApplicationSearch } from "@/composables/use-application-search";
import { MIN_CHAR_FOR_SEARCH } from "@/constants/min-char-for-search";
import {
  IS_MEDIATION_SERVICE,
  RELATION_TYPE_FILTERS,
  RELATION_TYPE_FILTERS_ARRAY,
  type MediationServiceField,
  type RelationTypeFilter,
} from "@/types/relation-type-filter";
import { typeguardIncludes } from "@/utils/typeguard-includes";
import { watch } from "vue";

const { searchApplications, setFilter, filters } = useApplicationSearch();
const isLoading = ref(false);
const errorMessage = ref("");
const componentKey = ref(0);
const defaultValue = ref<undefined | string>(undefined);

async function performSearch(query: string) {
  if (query && query.length >= MIN_CHAR_FOR_SEARCH) {
    isLoading.value = true;
    errorMessage.value = "";
    try {
      const response = await searchApplications(
        {
          search: query,
          pageSize: 10,
          is_part_of: RELATION_TYPE_FILTERS.neutral,
          is_data_user_of: RELATION_TYPE_FILTERS.neutral,
          is_service_user_of: RELATION_TYPE_FILTERS.neutral,
          in_replacement_of: RELATION_TYPE_FILTERS.neutral,
          use_sso_of: RELATION_TYPE_FILTERS.neutral,
          is_mediation_service: RELATION_TYPE_FILTERS.neutral,
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
    defaultValue.value = undefined;
  }
});

type RelationField = RelationType | MediationServiceField;

const relationFields: { field: RelationField; label: string; testId: string }[] = [
  { field: RelationType.IS_PART_OF, label: "Fait partie de", testId: "relation-is_part_of-select" },
  {
    field: RelationType.IN_REPLACEMENT_OF,
    label: "Remplace",
    testId: "relation-in_replacement_of-select",
  },
  {
    field: RelationType.IS_SERVICE_USER_OF,
    label: "Utilise le service de",
    testId: "relation-is_service_user_of-select",
  },
  {
    field: RelationType.IS_DATA_USER_OF,
    label: "Utilise la donnée de",
    testId: "relation-is_data_user_of-select",
  },
  {
    field: RelationType.USE_SSO_OF,
    label: "Utilise le SSO de",
    testId: "relation-use_sso_of-select",
  },
  {
    field: IS_MEDIATION_SERVICE,
    label: "Mediation de service",
    testId: "relation-mediation-service-select",
  },
];

const optionsMap: { text: string; value: RelationTypeFilter }[] = [
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

const updateFilter = (filterKey: RelationField, value: string | number) => {
  if (typeof value === "string" && typeguardIncludes(value, RELATION_TYPE_FILTERS_ARRAY)) {
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
      v-for="{ field, testId, label } in relationFields"
      :key="field"
      :model-value="filters[field] || RELATION_TYPE_FILTERS.neutral"
      :label="label"
      :options="optionsMap"
      :disabled="isLoading"
      :data-testid="testId"
      @update:model-value="updateFilter(field, $event)"
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
