<script setup lang="ts">
import { isApiSuccess } from "@/api/api-result";
import { computed, ref, shallowRef, watch, nextTick, onBeforeUnmount, useId } from "vue";
import { useRouter } from "vue-router";
import api from "@/api/index";
import type { RelationGraphDto } from "@/client";
import { useGraphStyles } from "@/composables/use-graph-style";
import { relationTypeLabels } from "@/constants/dictionary";
import { useD3Graph } from "@/composables/use-d3-graph";
import { filterRelationGraph } from "@/utils/relation-graph";
import RelationGraphList from "./RelationGraphList.vue";

const props = withDefaults(defineProps<{ applicationId: string; viewMode?: "list" | "graph"; refreshKey?: number }>(), {
  viewMode: "graph",
  refreshKey: 0,
});
const router = useRouter();
const { createInteractiveGraph } = useD3Graph();
const graphStyles = useGraphStyles().getGraphStyles();
const id = `relations-${useId()}`;
const transcriptionId = `${id}-transcription`;
const descriptionId = `${id}-description`;
const graphContainer = ref<HTMLElement | null>(null);
const graphData = ref<RelationGraphDto | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const depth = ref(1);
const loadedDepth = ref(1);
const enabledEdgeTypes = ref<Set<string>>(new Set(Object.keys(relationTypeLabels)));
const maxDepth = 100;
const minDepth = 1;
const filteredGraph = computed(() => (graphData.value ? filterRelationGraph(graphData.value, enabledEdgeTypes.value) : null));
const selectedNodeId = ref("");
const graphInstance = shallowRef<ReturnType<typeof createInteractiveGraph> | null>(null);
let requestId = 0;

async function fetchGraphData() {
  const currentRequest = ++requestId;
  const requestedDepth = depth.value;
  isLoading.value = true;
  error.value = null;
  graphData.value = null;
  graphInstance.value?.cleanup();
  graphInstance.value = null;
  try {
    const response = await api.relationControllerGetRelationGraph({
      path: { applicationId: props.applicationId },
      query: { depth: requestedDepth },
    });
    if (currentRequest !== requestId) return;
    if (!isApiSuccess(response) || !response.data) throw new Error("Erreur lors du chargement du graphe");
    loadedDepth.value = requestedDepth;
    graphData.value = response.data;
  } catch {
    if (currentRequest === requestId) error.value = "Impossible de charger le réseau des relations.";
  } finally {
    if (currentRequest === requestId) isLoading.value = false;
  }
}

async function renderGraph() {
  await nextTick();
  const data = filteredGraph.value;
  if (!graphContainer.value || !data || props.viewMode !== "graph") return;
  const activeElement = document.activeElement;
  const isFirstRender = !graphContainer.value.querySelector("svg");
  const scrollLeft = graphContainer.value.scrollLeft;
  const focusedNodeId =
    activeElement instanceof SVGElement && graphContainer.value.contains(activeElement) ? activeElement.dataset.nodeId : null;
  graphInstance.value?.cleanup();
  graphInstance.value = null;
  if (!data.nodes.length) return;
  try {
    const rootLabel = data.nodes.find((node) => node.id === data.rootId)?.label || props.applicationId;
    graphInstance.value = createInteractiveGraph(
      graphContainer.value,
      data.nodes,
      data.edges,
      data.rootId,
      (nodeId) => {
        router.push({ name: "application", params: { id: nodeId } });
      },
      undefined,
      {
        title: `Relations de ${rootLabel}, profondeur ${loadedDepth.value}`,
        descriptionId,
        detailsId: transcriptionId,
        nodeHref: (nodeId) => router.resolve({ name: "application", params: { id: nodeId } }).href,
      },
    );
    if (isFirstRender) {
      const root = Array.from(graphContainer.value.querySelectorAll<SVGAElement>("a[data-node-id]")).find(
        (node) => node.dataset.nodeId === data.rootId,
      );
      if (root && graphContainer.value.scrollWidth > graphContainer.value.clientWidth) {
        const rootBounds = root.getBoundingClientRect();
        const containerBounds = graphContainer.value.getBoundingClientRect();
        graphContainer.value.scrollLeft =
          rootBounds.left + rootBounds.width / 2 - containerBounds.left - graphContainer.value.clientWidth / 2;
      }
    } else {
      graphContainer.value.scrollLeft = scrollLeft;
    }
    if (focusedNodeId) {
      const replacement = Array.from(graphContainer.value.querySelectorAll<SVGAElement>("a[data-node-id]")).find(
        (node) => node.dataset.nodeId === focusedNodeId,
      );
      if (replacement) replacement.focus();
      else graphContainer.value.focus();
    }
  } catch {
    error.value = "Erreur lors du rendu du graphe. La liste complète des relations reste disponible.";
  }
}

function handleDepthChange() {
  depth.value = Number.isFinite(depth.value) ? Math.max(minDepth, Math.min(maxDepth, Math.trunc(depth.value))) : minDepth;
  fetchGraphData();
}

function toggleEdgeType(type: string) {
  const next = new Set(enabledEdgeTypes.value);
  if (next.has(type)) next.delete(type);
  else next.add(type);
  enabledEdgeTypes.value = next;
}

watch([() => props.applicationId, () => props.refreshKey], fetchGraphData, { immediate: true });
watch(filteredGraph, (data) => {
  if (data && !data.nodes.some((node) => node.id === selectedNodeId.value)) selectedNodeId.value = data.rootId;
});
watch([filteredGraph, () => props.viewMode], renderGraph);
onBeforeUnmount(() => {
  requestId++;
  graphInstance.value?.cleanup();
});
</script>

<template>
  <section class="relation-network" :aria-labelledby="`${id}-title`" :aria-busy="isLoading">
    <h3 :id="`${id}-title`" class="fr-h4">Réseau de relations</h3>
    <p :id="descriptionId" class="fr-sr-only">
      Réseau des applications liées selon la profondeur et les types de relation sélectionnés. Une liste complète et une aide à la
      navigation sont disponibles après le graphe.
    </p>
    <div class="relation-graph-wrapper">
      <div class="network-content">
        <div class="network-toolbar fr-mb-2w">
          <output aria-live="polite" aria-atomic="true" data-testid="relations-graph-status">
            <template v-if="isLoading">Chargement du réseau de relations…</template>
            <template v-else-if="filteredGraph"
              >{{ filteredGraph.nodes.length }} applications et {{ filteredGraph.edges.length }} relations affichées, profondeur
              {{ loadedDepth }}.</template
            >
          </output>
          <a v-if="filteredGraph && props.viewMode === 'graph'" class="fr-link" :href="`#${transcriptionId}`">
            Consulter la liste complète du graphe
          </a>
        </div>
        <p v-if="error" role="alert">{{ error }}</p>
        <DsfrButton v-if="error && !graphData" secondary @click="fetchGraphData">Réessayer le chargement du réseau</DsfrButton>
        <template v-if="filteredGraph && props.viewMode === 'graph'">
          <section
            ref="graphContainer"
            :id="`${id}-svg-container`"
            class="graph-container"
            aria-label="Graphe des relations, zone défilante"
            :aria-describedby="descriptionId"
            tabindex="0"
          ></section>
          <div class="graph-actions fr-mt-1w" role="group" aria-label="Commandes principales du graphe">
            <DsfrButton secondary :disabled="!graphInstance || isLoading" @click="graphInstance?.zoomIn()">Zoomer</DsfrButton>
            <DsfrButton secondary :disabled="!graphInstance || isLoading" @click="graphInstance?.zoomOut()">Dézoomer</DsfrButton>
            <DsfrButton secondary :disabled="!graphInstance || isLoading" @click="graphInstance?.resetZoom()">
              Réinitialiser le zoom
            </DsfrButton>
            <DsfrButton secondary :disabled="!graphInstance || isLoading" @click="graphInstance?.exportSVG()">Exporter en SVG</DsfrButton>
          </div>
        </template>
        <details v-if="props.viewMode === 'graph'" class="navigation-help fr-mt-2w">
          <summary class="fr-text--bold">Aide à la navigation</summary>
          <p class="fr-mt-2w">
            Dans le graphe, Entrée ouvre la fiche de l’application. Majuscule et les flèches déplacent un nœud. La molette et le
            glisser-déposer permettent de zoomer et de déplacer la vue ou les nœuds. Les commandes ci-dessous offrent les mêmes possibilités
            au clavier et sans glisser-déposer. La liste complète présente les mêmes applications, leur statut et leurs relations, à la
            profondeur et avec les filtres choisis.
          </p>
          <h4 class="fr-h6">Déplacer la vue</h4>
          <div class="control-buttons">
            <DsfrButton secondary :disabled="!graphInstance || isLoading" @click="graphInstance?.pan(80, 0)"
              >Déplacer la vue à gauche</DsfrButton
            >
            <DsfrButton secondary :disabled="!graphInstance || isLoading" @click="graphInstance?.pan(-80, 0)"
              >Déplacer la vue à droite</DsfrButton
            >
            <DsfrButton secondary :disabled="!graphInstance || isLoading" @click="graphInstance?.pan(0, 80)"
              >Déplacer la vue vers le haut</DsfrButton
            >
            <DsfrButton secondary :disabled="!graphInstance || isLoading" @click="graphInstance?.pan(0, -80)"
              >Déplacer la vue vers le bas</DsfrButton
            >
          </div>
          <fieldset class="node-movement fr-mt-2w" :disabled="!graphInstance || isLoading">
            <legend class="fr-h6">Déplacer un nœud</legend>
            <label class="fr-label" :for="`${id}-selected-node`">Nœud à déplacer dans le graphe</label>
            <select class="fr-select fr-mb-1w" :id="`${id}-selected-node`" v-model="selectedNodeId">
              <option v-for="node in filteredGraph?.nodes || []" :key="node.id" :value="node.id">
                {{ node.label || node.id }}{{ node.id === filteredGraph?.rootId ? " (application racine)" : "" }}
              </option>
            </select>
            <div class="control-buttons">
              <DsfrButton secondary @click="graphInstance?.moveNode(selectedNodeId, -20, 0)">Déplacer le nœud à gauche</DsfrButton>
              <DsfrButton secondary @click="graphInstance?.moveNode(selectedNodeId, 20, 0)">Déplacer le nœud à droite</DsfrButton>
              <DsfrButton secondary @click="graphInstance?.moveNode(selectedNodeId, 0, -20)">Déplacer le nœud vers le haut</DsfrButton>
              <DsfrButton secondary @click="graphInstance?.moveNode(selectedNodeId, 0, 20)">Déplacer le nœud vers le bas</DsfrButton>
            </div>
          </fieldset>
        </details>
      </div>
      <div class="sidebar fr-p-2w">
        <div class="depth-controls fr-input-group">
          <label class="fr-label" :for="`${id}-depth-range`">Profondeur du réseau : {{ depth }}</label>
          <input
            class="fr-range"
            :id="`${id}-depth-range`"
            type="range"
            :min="minDepth"
            :max="maxDepth"
            v-model.number="depth"
            @change="handleDepthChange"
          />
          <label class="fr-label" :for="`${id}-depth-number`">Saisir la profondeur du réseau</label>
          <input
            class="fr-input depth-input"
            :id="`${id}-depth-number`"
            type="number"
            :min="minDepth"
            :max="maxDepth"
            step="1"
            v-model.number="depth"
            @change="handleDepthChange"
          />
        </div>
        <fieldset class="legend">
          <legend class="fr-h5">Types de relation affichés</legend>
          <div v-for="(label, type) in relationTypeLabels" :key="type" class="fr-checkbox-group fr-mb-1w">
            <input type="checkbox" :checked="enabledEdgeTypes.has(type)" @change="toggleEdgeType(type)" :id="`${id}-legend-${type}`" />
            <label :for="`${id}-legend-${type}`" class="legend-label">
              <svg width="48" height="16" viewBox="0 0 48 16" aria-hidden="true" focusable="false" class="legend-line">
                <line
                  x1="0"
                  y1="8"
                  x2="48"
                  y2="8"
                  :stroke="graphStyles.edge[type].color"
                  :stroke-dasharray="graphStyles.edge[type].dasharray"
                  stroke-width="2"
                />
              </svg>
              <span
                >{{ label }} <span class="fr-text--xs">({{ graphStyles.edge[type].patternLabel }})</span></span
              >
            </label>
          </div>
        </fieldset>
      </div>
      <RelationGraphList
        v-if="filteredGraph"
        :graph="filteredGraph"
        :depth="loadedDepth"
        :id="transcriptionId"
        class="network-transcription"
      />
    </div>
  </section>
</template>

<style scoped>
.relation-network {
  min-width: 0;
}
.relation-graph-wrapper {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(14rem, 19rem);
  grid-template-areas: "content sidebar" "transcription sidebar";
  gap: 1.5rem;
  align-items: start;
}
.sidebar {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
}
.network-content {
  grid-area: content;
  min-width: 0;
}
.network-transcription {
  grid-area: transcription;
}
.graph-container {
  height: clamp(20rem, 60vh, 37.5rem);
  width: 100%;
  border: 1px solid var(--border-default-grey);
  overflow: auto;
  background: var(--background-default-grey);
}
.depth-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}
.depth-controls .fr-range {
  width: 100%;
}
.depth-input {
  width: 100%;
  max-width: 8rem;
}
.network-toolbar,
.graph-actions,
.control-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
}
.network-toolbar {
  justify-content: space-between;
}
.navigation-help {
  padding: 1rem;
  border: 1px solid var(--border-default-grey);
}
.navigation-help summary {
  cursor: pointer;
}
.legend {
  min-width: 0;
  border: 0;
  padding: 0;
}
.node-movement {
  min-width: 0;
  border: 0;
  padding: 0;
}
.legend-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow-wrap: anywhere;
}
.legend-line {
  flex-shrink: 0;
}
output {
  display: block;
}
@media (max-width: 62rem) {
  .relation-graph-wrapper {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "content" "sidebar" "transcription";
  }
  .sidebar {
    width: 100%;
  }
  .network-content {
    width: 100%;
  }
  .control-buttons {
    flex-flow: row wrap;
  }
}
</style>
