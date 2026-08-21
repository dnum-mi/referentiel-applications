<script setup lang="ts">
import type { QualitySummaryDto } from "@/client/types.gen";
import { computed } from "vue";
import { routeNames } from "@/router/route-names";
import { getQualityNextActions, type QualityImpact } from "@/utils/quality-next-actions";

const props = defineProps<{
  applicationId: string;
  summary: QualitySummaryDto;
}>();

const IMPACT_LABELS: Record<QualityImpact, string> = {
  high: "Impact fort",
  medium: "Impact moyen",
  low: "Impact secondaire",
};

const IMPACT_BADGE_TYPES: Record<QualityImpact, "error" | "warning" | "info"> = {
  high: "error",
  medium: "warning",
  low: "info",
};

const nextActions = computed(() => getQualityNextActions(props.summary));

function tabLink(tabId: string) {
  return { name: routeNames.PROFILEAPP, params: { id: props.applicationId, tab: tabId } };
}
</script>

<template>
  <div class="quality-next-actions" data-testid="quality-next-actions">
    <h4>Prochaines actions</h4>

    <p v-if="nextActions.length === 0" class="fr-text--sm" data-testid="quality-next-actions-complete">
      Tous les critères pris en compte dans l'indice de qualité sont renseignés. 🎉
    </p>

    <template v-else>
      <p class="fr-text--sm fr-mb-2w">
        Ces éléments contribuent à l'indice de qualité. Leur impact réel dépend de ce qui est déjà renseigné : le renseigner ne garantit pas
        un gain de points fixe, mais y contribue toujours favorablement.
      </p>
      <ul class="next-actions-list" data-testid="quality-next-actions-list">
        <li v-for="action in nextActions" :key="action.key" class="next-action-item">
          <RouterLink :to="tabLink(action.tabId)" class="next-action-link" :data-testid="`quality-next-action-${action.key}`">
            <VIcon name="ri-arrow-right-line" class="next-action-icon" />
            <span>{{ action.label }}</span>
          </RouterLink>
          <DsfrBadge :label="IMPACT_LABELS[action.impact]" :type="IMPACT_BADGE_TYPES[action.impact]" small />
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.quality-next-actions {
  margin-top: 1.5rem;
}

.next-actions-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.next-action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-default-grey);
  border-radius: 0.25rem;
}

.next-action-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.next-action-icon {
  flex-shrink: 0;
}
</style>
