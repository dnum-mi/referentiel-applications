<script setup lang="ts">
import { computed, ref, watch } from "vue";
import SuggestionsInput from "../SuggestionsInput.vue";
import { RelationType, type ApplicationDto, type RelationDto } from "@/client/types.gen";
import { useApplicationSearch } from "@/composables/use-application-search";
import { NEUTRAL_RELATION_FILTERS } from "@/types/relation-type-filter";
import type { RelationCreate, RelationUpdate } from "@/models/relations";
import { buildRelationUpdate } from "@/utils/relation-update";

const props = withDefaults(
  defineProps<{
    mode: "add" | "edit";
    opened?: boolean;
    title: string;
    applicationId: string;
    relation?: RelationDto | null;
  }>(),
  { opened: false, relation: null },
);

const emit = defineEmits<{
  close: [];
  addRelation: [payload: Omit<RelationCreate, "applicationSourceId">];
  updateRelation: [payload: RelationUpdate];
}>();

const { searchApplications } = useApplicationSearch();
const selectedApplication = ref<Pick<ApplicationDto, "id" | "label"> | null>(null);
const selectedMediationService = ref<Pick<ApplicationDto, "id" | "label"> | null>(null);
const relationType = ref<RelationType>(RelationType.IS_PART_OF);
const errorMessage = ref("");
const formKey = ref(0);
const testIdPrefix = computed(() => (props.mode === "edit" ? "edit-relation" : "relation"));
const canSelectApplication = computed(() => props.mode === "add" || props.relation?.applicationSourceId === props.applicationId);

watch(
  [() => props.opened, () => props.mode, () => props.relation, () => props.applicationId],
  () => {
    const relation = props.mode === "edit" ? props.relation : null;
    selectedApplication.value = relation
      ? ((relation.applicationSourceId === props.applicationId ? relation.targetApplication : relation.sourceApplication) ?? null)
      : null;
    selectedMediationService.value = relation?.mediationService ?? null;
    relationType.value = relation?.type ?? RelationType.IS_PART_OF;
    errorMessage.value = "";
    formKey.value++;
  },
  { immediate: true },
);

const relationTypesForSelect = [
  { value: RelationType.IS_PART_OF, text: "Fait partie de" },
  { value: RelationType.IN_REPLACEMENT_OF, text: "Remplace" },
  { value: RelationType.IS_SERVICE_USER_OF, text: "Utilise le service de" },
  { value: RelationType.IS_DATA_USER_OF, text: "Utilise la donnée de" },
  { value: RelationType.USE_SSO_OF, text: "Utilise le SSO de" },
  { value: RelationType.IS_CORRELATED_WITH, text: "Est corrélée à" },
];

async function searchApplicationsForRelation(query: string) {
  const response = await searchApplications({ search: query, pageSize: 10, ...NEUTRAL_RELATION_FILTERS, relationAppId: undefined }, false);
  return response.results;
}

function submitRelation() {
  if (!selectedApplication.value) {
    errorMessage.value = "L'application cible est requise.";
    return;
  }
  if (!relationType.value) {
    errorMessage.value = "Le type de relation est requis.";
    return;
  }
  if (!props.applicationId) {
    errorMessage.value = "L'application source est introuvable.";
    return;
  }

  const edited = {
    type: relationType.value,
    mediationServiceId: selectedMediationService.value?.id || null,
    counterpartId: selectedApplication.value.id,
  };
  if (props.mode === "edit") {
    if (!props.relation) {
      errorMessage.value = "La relation à mettre à jour est introuvable.";
      return;
    }
    emit("updateRelation", buildRelationUpdate(props.relation, props.applicationId, edited));
  } else {
    emit("addRelation", {
      applicationTargetId: edited.counterpartId,
      type: edited.type,
      mediationServiceId: edited.mediationServiceId,
    });
  }
  emit("close");
}
</script>

<template>
  <DsfrModal :opened="opened" :title="title" :data-testid="`${testIdPrefix}-modal`" @close="emit('close')">
    <template #default>
      <DsfrAlert
        v-show="errorMessage.length > 0"
        class="mb-4"
        tabindex="-1"
        type="error"
        role="alert"
        aria-live="assertive"
        title="Une erreur est survenue"
        :description="errorMessage"
      />
      <div class="relation-type">
        <DsfrSelect
          v-model="relationType"
          :options="relationTypesForSelect"
          label="Type de relation"
          default-unselected-text="Sélectionner une option"
          :data-testid="`${testIdPrefix}-type-select`"
        />
      </div>

      <template v-if="opened">
        <!-- Depuis la fiche cible, garder la source en lecture seule pour ne pas détacher la fiche courante (#2385). -->
        <SuggestionsInput
          v-if="canSelectApplication"
          :key="`target-${formKey}`"
          :search-data-function="searchApplicationsForRelation"
          label="Rechercher une application"
          placeholder="Tapez au moins 3 caractères"
          search-error-message="Erreur lors de la recherche d'applications."
          data-testid="relation-suggestions-input"
          @update:selected-value="selectedApplication = $event ?? null"
        >
          <template #application-label>
            <DsfrTag
              v-if="mode === 'add' && selectedApplication?.label"
              :label="selectedApplication.label"
              :value="selectedApplication.label"
              :selected="false"
              :small="false"
              selectable
              class="fr-tag--dismiss"
              style="margin-top: 15px"
              @select="selectedApplication = null"
            />
            <DsfrTag v-else-if="selectedApplication?.label" :label="selectedApplication.label" :small="false" style="margin-top: 15px" />
          </template>
        </SuggestionsInput>
        <div v-else class="linked-application" data-testid="relation-linked-application">
          <p class="fr-label">Application source liée</p>
          <DsfrTag v-if="selectedApplication?.label" :label="selectedApplication.label" :small="false" />
          <p class="fr-hint-text fr-mt-1w">
            Cette relation part de l'application ci-dessus. Depuis la fiche cible, seuls le type et le service de médiation sont
            modifiables.
          </p>
        </div>

        <SuggestionsInput
          :key="`mediation-${formKey}`"
          :search-data-function="searchApplicationsForRelation"
          label="Rechercher une application de mediation service (optionnel)"
          placeholder="Tapez au moins 3 caractères"
          search-error-message="Erreur lors de la recherche d'applications."
          data-testid="relation-suggestions-mediation-service-input"
          @update:selected-value="selectedMediationService = $event ?? null"
        >
          <template #application-label>
            <DsfrTag
              v-if="selectedMediationService?.label"
              :label="selectedMediationService.label"
              :value="selectedMediationService.label"
              :selected="false"
              selectable
              style="margin-top: 15px"
              @select="selectedMediationService = null"
              class="fr-tag--dismiss"
            />
          </template>
        </SuggestionsInput>
      </template>
    </template>

    <template #footer>
      <DsfrButton label="Enregistrer" :data-testid="`${testIdPrefix}-save-btn`" @click="submitRelation" />
      <DsfrButton label="Annuler" secondary :data-testid="`${testIdPrefix}-cancel-btn`" @click="emit('close')" />
    </template>
  </DsfrModal>
</template>

<style scoped>
.relation-type {
  margin-top: 1rem;
}
</style>
