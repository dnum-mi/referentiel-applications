<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import api from "@/api/index";
import type { RelationGraphDto } from "@/client";
import { useGraphStyles } from "@/composables/use-graph-style";
import { relationTypeLabels } from "@/composables/use-dictionary";
import { useD3Graph } from "@/composables/use-d3-graph";

const props = defineProps<{ applicationId: string }>();
const router = useRouter();
const { createInteractiveGraph } = useD3Graph();
const { getGraphStyles } = useGraphStyles();
const graphStyles = getGraphStyles();

const graphContainer = ref<HTMLElement | null>(null);
const graphData = ref<RelationGraphDto | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const depth = ref(1);
const enabledEdgeTypes = ref<Set<string>>(new Set(Object.keys(relationTypeLabels)));
const maxDepth = 100;
const minDepth = 1;

let graphInstance: ReturnType<typeof createInteractiveGraph> | null = null;


async function fetchGraphData() {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await api.relationControllerGetRelationGraph({
      path: { applicationId: props.applicationId },
      query: { depth: depth.value },
    });
    if (!response.response.ok) throw new Error("Erreur lors du chargement du graphe");
    graphData.value = response.data || null;
  } catch {
    error.value = "Impossible de charger le graphe des relations";
    graphData.value = null;
  } finally {
    isLoading.value = false;
  }
}


function callNodeLink(nodeId: string) {
  router.push({ name: "application", params: { id: nodeId } });
}


async function renderGraph() {
  if (!graphContainer.value) await nextTick();
  if (!graphContainer.value || !graphData.value) return;

  const { nodes, edges, rootId } = graphData.value;
  const filteredEdges = edges.filter(e => enabledEdgeTypes.value.has(e.type));

  const visibleNodeIds = new Set<string>();
  filteredEdges.forEach(edge => {
    visibleNodeIds.add(edge.sourceId);
    visibleNodeIds.add(edge.targetId);
  });

  if (nodes.length === 0) {
    graphContainer.value.innerHTML = "<p class='fr-text--center'>Aucune relation à afficher</p>";
    return;
  }

  try {
    if (graphInstance) {
      graphInstance.cleanup();
    }

    graphInstance = createInteractiveGraph(
      graphContainer.value,
      nodes,
      filteredEdges,
      rootId,
      callNodeLink,
      visibleNodeIds
    );
  } catch {
    error.value = "Erreur lors du rendu du graphe";
  }
}


function handleDepthChange() {
  if (depth.value < minDepth) depth.value = minDepth;
  else if (depth.value > maxDepth) depth.value = maxDepth;
  fetchGraphData();
}

function handleResetZoom() {
  if (graphInstance) {
    graphInstance.resetZoom();
  }
}

function handleExportSVG() {
  if (graphInstance) {
    graphInstance.exportSVG();
  }
}

function toggleEdgeType(type: string) {
  if (enabledEdgeTypes.value.has(type)) {
    enabledEdgeTypes.value.delete(type);
  } else {
    enabledEdgeTypes.value.add(type);
  }
  enabledEdgeTypes.value = new Set(enabledEdgeTypes.value);
  renderGraph();
}

watch(graphData, () => renderGraph());
watch(enabledEdgeTypes, () => renderGraph(), { deep: true });


function getLineStyle(type: string): string {
  const style = graphStyles.edge[type as keyof typeof graphStyles.edge]?.style;
  switch (style) {
    case 'dashed':
      return 'line-style-dashed';
    case 'dotted':
      return 'line-style-dotted';
    case 'solid':
    default:
      return 'line-style-solid';
  }
}

onMounted(() => {
  fetchGraphData();
});

onBeforeUnmount(() => {
  if (graphInstance) {
    graphInstance.cleanup();
  }
});
</script>

<template>
  <div class="relation-graph-wrapper fr-p-2w">
    <div class="sidebar fr-p-2w fr-card fr-shadow">
      
      <div class="depth-controls fr-input-group">
        <label class="fr-label" for="depthRange">Profondeur du graphe : **{{ depth }}**</label>
        <input
          class="fr-range"
          id="depthRange"
          type="range"
          :min="minDepth"
          :max="maxDepth"
          v-model.number="depth"
          @change="handleDepthChange"
        />
        <input
          class="fr-input depth-input"
          type="number"
          :min="minDepth"
          :max="maxDepth"
          v-model.number="depth"
          @change="handleDepthChange"
        />
      </div>

      <div class="graph-controls">
        <h3 class="fr-h4">Contrôles du graphe</h3>
        <div class="control-buttons">
          <DsfrButton
            secondary
            @click="handleResetZoom"
            title="Réinitialiser le zoom"
          >
            <span class="fr-icon-refresh-line" aria-hidden="true"></span>
            Réinitialiser zoom
          </DsfrButton>
          <DsfrButton
            secondary
            @click="handleExportSVG"
            title="Exporter le graphe en SVG"
          >
            <span class="fr-icon-download-line" aria-hidden="true"></span>
            Exporter en SVG
          </DsfrButton>
        </div>
        <p class="help-text">
          💡 Utilisez la molette pour **zoomer/dézoomer**, cliquez-glissez pour **déplacer la vue**, et glissez les nœuds pour **réorganiser** le graphe.
        </p>
        <div v-if="isLoading" class="fr-text--info loading">Chargement du graphe...</div>
        <div v-if="error" class="fr-text--error error">{{ error }}</div>
      </div>

      <div class="legend">
        <h3 class="fr-h4">Légende des relations</h3>
        <ul class="fr-p-0 fr-m-0 fr-list--unstyled">
          <li v-for="(label, type) in relationTypeLabels" :key="type">
            <div class="fr-checkbox-group">
                <input
                    type="checkbox"
                    :checked="enabledEdgeTypes.has(type)"
                    @change="toggleEdgeType(type)"
                    :id="'legend-' + type"
                />
                <label :for="'legend-' + type" class="legend-label">
                    <span 
                        class="legend-line" 
                        :class="getLineStyle(type)"
                        :style="{ backgroundColor: graphStyles.edge[type as keyof typeof graphStyles.edge]?.color || 'var(--text-default-grey)' }"
                    ></span>
                    <span class="legend-text">{{ label }}</span>
                </label>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div ref="graphContainer" class="graph-container fr-card fr-shadow">
      </div>
  </div>
</template>

<style scoped>

.relation-graph-wrapper {
  display: flex;
  gap: 1.5rem; 
  min-height: 80vh;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 300px; 
  flex-shrink: 0;
  border: none; 
}

.graph-container {
  flex-grow: 1;
  min-height: 600px;
  border: 1px solid var(--border-default-grey);
  border-radius: var(--border-radius-2);
  overflow: hidden;
  background-color: var(--background-default-grey);
  position: relative;
}

.depth-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.depth-controls .fr-range {
  flex-grow: 1;
}

.depth-input {
  width: 5rem;
  text-align: center;
}

.graph-controls {
  padding-top: 1rem;
}

.graph-controls h3 {
  margin-bottom: 0.75rem;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.help-text {
  margin-top: 1rem;
  font-size: 0.85rem;
  color: var(--text-mention-grey);
}

.legend {
  border-top: 1px solid var(--border-default-grey);
  padding-top: 1rem;
}

.legend h3 {
  margin-bottom: 1rem;
}

.legend li {
  margin-bottom: 0.5rem;
}

.legend-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.legend-line {
    display: inline-block;
    width: 30px; 
    height: 3px;
    border-radius: 1px;
    background-color: currentColor;
}

.line-style-dashed {
  background-image: linear-gradient(to right, currentColor 60%, transparent 60%);
  background-size: 10px 100%;
}

.line-style-dotted {
  background-image: linear-gradient(to right, currentColor 30%, transparent 30%);
  background-size: 5px 100%;
  border-radius: 50%; 
  height: 5px; 
}

.fr-checkbox-group {
    display: flex;
    align-items: center;
}
.fr-checkbox-group input[type="checkbox"] {
    margin-right: 0.5rem;
}
</style>