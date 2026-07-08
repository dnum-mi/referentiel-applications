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

const relationFields: { field: RelationField; label: string; testId: string; tooltip: string }[] = [
  {
    field: RelationType.IS_PART_OF,
    label: "Fait partie de",
    testId: "relation-is_part_of-select",
    tooltip:
      "Applications qui font partie de l’application sélectionnée ci-dessus. Inclure pour ne garder que celles-ci, Exclure pour les retirer, Neutre pour ignorer ce critère.",
  },
  {
    field: RelationType.IN_REPLACEMENT_OF,
    label: "Remplace",
    testId: "relation-in_replacement_of-select",
    tooltip:
      "Applications qui remplacent l’application sélectionnée ci-dessus. Inclure pour ne garder que celles-ci, Exclure pour les retirer, Neutre pour ignorer ce critère.",
  },
  {
    field: RelationType.IS_SERVICE_USER_OF,
    label: "Utilise le service de",
    testId: "relation-is_service_user_of-select",
    tooltip:
      "Applications qui utilisent un service fourni par l’application sélectionnée ci-dessus. Inclure pour ne garder que celles-ci, Exclure pour les retirer, Neutre pour ignorer ce critère.",
  },
  {
    field: RelationType.IS_DATA_USER_OF,
    label: "Utilise la donnée de",
    testId: "relation-is_data_user_of-select",
    tooltip:
      "Applications qui utilisent des données fournies par l’application sélectionnée ci-dessus. Inclure pour ne garder que celles-ci, Exclure pour les retirer, Neutre pour ignorer ce critère.",
  },
  {
    field: RelationType.USE_SSO_OF,
    label: "Utilise le SSO de",
    testId: "relation-use_sso_of-select",
    tooltip:
      "Applications qui utilisent l’authentification unique (SSO) de l’application sélectionnée ci-dessus. Inclure pour ne garder que celles-ci, Exclure pour les retirer, Neutre pour ignorer ce critère.",
  },
  {
    field: IS_MEDIATION_SERVICE,
    label: "Mediation de service",
    testId: "relation-mediation-service-select",
    tooltip:
      "Applications qui assurent un service de médiation pour l’application sélectionnée ci-dessus. Inclure pour ne garder que celles-ci, Exclure pour les retirer, Neutre pour ignorer ce critère.",
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
      tooltip-content="Sélectionne l’application de référence utilisée pour filtrer les relations ci-dessous (fait partie de, remplace, utilise le service de…)."
      placeholder="Tapez au moins 3 caractères"
      data-testid="relation-suggestions-input"
    />
    <DsfrSelect
      v-for="{ field, testId, label, tooltip } in relationFields"
      :key="field"
      :model-value="filters[field] || RELATION_TYPE_FILTERS.neutral"
      :options="optionsMap"
      :disabled="isLoading"
      :aria-describedby="`relation-${field}-tooltip-desc`"
      :data-testid="testId"
      @update:model-value="updateFilter(field, $event)"
    >
      <template #label>
        <span style="display: inline-flex; align-items: center; gap: 0.25rem">
          {{ label }}
          <DsfrTooltip :id="`relation-${field}-tooltip-desc`" :content="tooltip" />
        </span>
      </template>
    </DsfrSelect>
  </div>
</template>

<style scoped>
.relation-filters {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
</style>
