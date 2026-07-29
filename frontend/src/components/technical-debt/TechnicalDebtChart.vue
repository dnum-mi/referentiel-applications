<script setup lang="ts">
import type { TechnicalDebtPoint } from "@/composables/use-application-search";
import { useTechnicalDebtChart } from "@/composables/use-technical-debt-chart";
import { getTimeQuadrant, type TimeQuadrant } from "@/utils/get-time-quadrant";
import { computed } from "vue";

const props = defineProps<{
  data: TechnicalDebtPoint[];
  height?: number;
}>();

// containerRef et svgRef doivent être déclarés ici pour être exposés au template.
// En <script setup>, Vue résout ref="containerRef" en cherchant la variable dans ce scope.
// Sans cette destructuration, les refs du composable resteraient null et le chart ne se dessinerait pas.
const { containerRef, svgRef } = useTechnicalDebtChart(props);

// RGAA-082 (1.6) : transcription textuelle du diagramme SVG. Libellés de quadrant
// alignés sur ceux affichés dans le graphe (cf. time-chart.builder.ts).
const QUADRANT_LABELS_FR: Record<TimeQuadrant, string> = {
  Tolerate: "Tolérer",
  Invest: "À privilégier",
  Migrate: "À migrer",
  Eliminate: "À décommissionner",
};

const PLACEHOLDER = "—";

const transcriptionRows = computed(() =>
  props.data.map((point) => {
    const info = point.technicalDebtInfo;
    const technicalMaturity = info?.technicalMaturity;
    const businessMaturity = info?.businessMaturity;
    const quadrant =
      typeof technicalMaturity === "number" && typeof businessMaturity === "number"
        ? QUADRANT_LABELS_FR[getTimeQuadrant(technicalMaturity, businessMaturity)]
        : PLACEHOLDER;
    return {
      key: point.id,
      id: point.id,
      name: point.shortName || point.label,
      technicalMaturity: technicalMaturity ?? PLACEHOLDER,
      businessMaturity: businessMaturity ?? PLACEHOLDER,
      cost: info?.costContainment ?? PLACEHOLDER,
      quadrant,
    };
  }),
);
</script>

<template>
  <div ref="containerRef" class="technical-debt-scatter">
    <template v-if="props.data.length">
      <details class="td-accordion fr-mt-2w" data-testid="technical-debt-diagram" open>
        <summary>Diagramme TIME</summary>
        <svg
          ref="svgRef"
          role="img"
          class="td-svg"
          aria-label="Diagramme TIME de la maturité technique et métier du portefeuille applicatif. La transcription détaillée est disponible juste après le graphique."
          preserveAspectRatio="xMidYMid meet"
        ></svg>
      </details>

      <details class="td-accordion fr-mt-2w" data-testid="technical-debt-transcription">
        <summary id="technical-debt-transcription-title">Tableau de synthèse</summary>
        <div class="fr-table fr-table--bordered fr-mt-1w">
          <table aria-labelledby="technical-debt-transcription-title">
            <thead>
              <tr>
                <th scope="col">Application</th>
                <th scope="col">Maturité technique</th>
                <th scope="col">Maturité métier</th>
                <th scope="col">Maîtrise des coûts MCO</th>
                <th scope="col">Quadrant TIME</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in transcriptionRows" :key="row.key">
                <td>
                  <router-link :to="{ name: 'application', params: { id: row.key } }">
                    {{ row.name }}
                  </router-link>
                </td>
                <td>{{ row.technicalMaturity }}</td>
                <td>{{ row.businessMaturity }}</td>
                <td>{{ row.cost }}</td>
                <td>{{ row.quadrant }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </template>
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

.td-svg {
  width: 100%;
  height: auto;
  max-width: 100%;
}

.td-accordion > summary {
  font-size: 1.25rem;
  font-weight: 700;
}
</style>
