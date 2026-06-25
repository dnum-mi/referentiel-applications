<script setup lang="ts">
import { computed } from "vue";
import type { TechnicalDebtInfoDto } from "@/client/types.gen";

const props = defineProps<{
  technicalDebtInfo: TechnicalDebtInfoDto | null;
  canEdit: boolean;
  small?: boolean;
}>();

defineEmits<{
  create: [];
  edit: [];
}>();

const NOT_RATED_LABEL = "Non notée";

const maturityLabels: Record<number, string> = {
  1: "Faible",
  2: "Moyen",
  3: "Correct",
  4: "Bon",
  5: "Excellent",
};

function getMaturityLabel(value: number): string {
  const rounded = Math.min(5, Math.max(1, Math.round(value)));
  return maturityLabels[rounded] ?? "Non défini";
}

// `null` = non noté (les scores < 1 ont été migrés vers `null`, cf. ticket #1900).
function getBadgeLabel(value: number | null): string {
  return value == null ? NOT_RATED_LABEL : `${value}/5 - ${getMaturityLabel(value)}`;
}

function getMaturityBadgeType(value: number | null): "error" | "warning" | "info" | "success" | undefined {
  if (value == null) return undefined;
  if (value <= 1) return "error";
  if (value <= 2) return "warning";
  if (value <= 3) return "info";
  return "success";
}

const maturityFields = computed(() => [
  { key: "technicalMaturity", label: "Maturité technique", value: props.technicalDebtInfo?.technicalMaturity ?? null },
  { key: "businessMaturity", label: "Maturité métier", value: props.technicalDebtInfo?.businessMaturity ?? null },
  { key: "costContainment", label: "Maîtrise des coûts", value: props.technicalDebtInfo?.costContainment ?? null },
]);
</script>

<template>
  <div class="fr-card" data-testid="technical-debt-card">
    <div class="fr-card__body">
      <div class="fr-card__content">
        <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
          <div class="fr-col">
            <h3 class="fr-card__title">Dette technique</h3>
          </div>
          <div class="fr-col-auto">
            <DsfrButton
              tertiary
              size="sm"
              :class="technicalDebtInfo ? 'fr-btn--icon-left fr-icon-edit-line' : 'fr-btn--icon-left fr-icon-add-line'"
              :label="technicalDebtInfo ? 'Modifier' : 'Ajouter'"
              :disabled="!canEdit"
              :data-testid="technicalDebtInfo ? 'technical-debt-edit-btn' : 'technical-debt-create-btn'"
              @click="technicalDebtInfo ? $emit('edit') : $emit('create')"
            />
          </div>
        </div>

        <template v-if="technicalDebtInfo">
          <div class="fr-grid-row fr-grid-row--gutters">
            <div v-for="field in maturityFields" :key="field.key" class="fr-col-12 fr-col-md-4">
              <p class="fr-text--bold fr-mb-1v">
                {{ field.label }}
              </p>
              <DsfrBadge
                :label="getBadgeLabel(field.value)"
                :type="getMaturityBadgeType(field.value)"
                :small="small"
                :data-testid="`${field.key}-badge`"
              />
            </div>
          </div>
        </template>
        <template v-else>
          <p class="fr-text--sm fr-text--italic" data-testid="technical-debt-empty">Aucune information de dette technique définie.</p>
        </template>
      </div>
    </div>
  </div>
</template>
