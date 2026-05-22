<script setup lang="ts">
import type { TechnicalDebtPoint } from "@/composables/use-application-search";
import { useTechnicalDebtChart } from "@/composables/use-technical-debt-chart";

const props = defineProps<{
  data: TechnicalDebtPoint[];
  height?: number;
}>();

// containerRef et svgRef doivent être déclarés ici pour être exposés au template.
// En <script setup>, Vue résout ref="containerRef" en cherchant la variable dans ce scope.
// Sans cette destructuration, les refs du composable resteraient null et le chart ne se dessinerait pas.
const { containerRef, svgRef } = useTechnicalDebtChart(props);
</script>

<template>
  <div ref="containerRef" class="technical-debt-scatter">
    <svg v-if="props.data.length" ref="svgRef" role="img" aria-label="Graphique de maturité TIME"></svg>
    <p v-else class="fr-text--sm fr-text--italic fr-mt-2w" data-testid="technical-debt-empty">
      Aucune donnée TIME disponible pour vos applications autorisées.
    </p>
  </div>
</template>

<style scoped>
.technical-debt-scatter {
  position: relative;
  width: 100%;
}

.td-tooltip {
  z-index: 1;
}
</style>
