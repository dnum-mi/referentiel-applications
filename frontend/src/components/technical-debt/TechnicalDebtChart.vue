<script setup lang="ts">
import type { TechnicalDebtPoint } from "@/composables/use-application-search";
import { useTechnicalDebtChart } from "@/composables/use-technical-debt-chart";
import { getTimeQuadrant, TimeQuadrantWording, TRESHOLD_TIME_MATURITY } from "@/utils/get-time-quadrant";
import { computed, ref, useId } from "vue";

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
const id = `time-${useId()}`;
const transcriptionRef = ref<HTMLDetailsElement | null>(null);

const PLACEHOLDER = "—";

const transcriptionRows = computed(() =>
  props.data.map((point) => {
    const info = point.technicalDebtInfo;
    const technicalMaturity = info?.technicalMaturity;
    const businessMaturity = info?.businessMaturity;
    const quadrant =
      typeof technicalMaturity === "number" && typeof businessMaturity === "number"
        ? TimeQuadrantWording[getTimeQuadrant(technicalMaturity, businessMaturity)]
        : PLACEHOLDER;
    return {
      key: point.id,
      id: point.id,
      name: point.label,
      shortName: point.shortName && point.shortName !== point.label ? point.shortName : "",
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
        <summary :id="`${id}-title`">Diagramme TIME</summary>
        <p :id="`${id}-description`">
          La position représente la maturité métier (axe horizontal) et technique (axe vertical), de 1 à 5. Les axes se croisent au seuil
          {{ TRESHOLD_TIME_MATURITY }}. La taille et la couleur des bulles représentent la maîtrise des coûts MCO. Chaque bulle ouvre la
          fiche de l’application ; ses valeurs s’affichent au survol ou au clavier et Échap ferme l’infobulle. Les bulles vides en
          pointillés ont une maîtrise des coûts non renseignée. Les applications sans maturités renseignées figurent uniquement dans le
          tableau.
        </p>
        <a class="fr-link fr-mb-2w" :href="`#${id}-table`" @click="transcriptionRef && (transcriptionRef.open = true)"
          >Consulter le tableau complet du diagramme TIME</a
        >
        <div class="td-diagram-scroller" role="region" aria-label="Diagramme TIME, zone défilante" tabindex="0">
          <svg
            :id="`${id}-svg`"
            ref="svgRef"
            role="img"
            class="td-svg"
            :aria-labelledby="`${id}-title`"
            :aria-describedby="`${id}-description`"
            :aria-details="`${id}-table`"
            preserveAspectRatio="xMidYMid meet"
          ></svg>
        </div>
      </details>

      <details ref="transcriptionRef" class="td-accordion fr-mt-2w" data-testid="technical-debt-transcription">
        <summary :id="`${id}-transcription-title`">Tableau de synthèse TIME</summary>
        <div
          class="fr-table fr-table--bordered fr-mt-1w td-table"
          role="region"
          aria-label="Tableau complet du diagramme TIME, zone défilante"
          tabindex="0"
        >
          <table :id="`${id}-table`" tabindex="-1">
            <caption>
              Maturités, maîtrise des coûts MCO et quadrant TIME de toutes les applications du diagramme (échelle de 1 à 5)
            </caption>
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
                <th scope="row">
                  <router-link :to="{ name: 'application', params: { id: row.key } }">
                    {{ row.name }}
                    <span v-if="row.shortName"> ({{ row.shortName }})</span>
                  </router-link>
                </th>
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
  min-width: 0;
}

.td-diagram-scroller,
.td-table {
  max-width: 100%;
  overflow: auto;
}
.td-table caption {
  text-align: left;
  font-weight: 700;
  margin-bottom: 1rem;
}
.td-table th,
.td-table td {
  white-space: normal;
  overflow-wrap: anywhere;
}

.td-svg {
  width: 100%;
  height: auto;
  min-width: 640px;
}

.td-accordion > summary {
  font-size: 1.25rem;
  font-weight: 700;
}
</style>
