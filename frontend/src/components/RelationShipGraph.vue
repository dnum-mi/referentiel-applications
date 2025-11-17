<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useMermaid } from "@/composables/use-mermaid";
import api from "@/api/index";
import type { RelationGraphDto } from "@/client";
import { useMermaidGraph } from "@/composables/use-mermaid-graph";
import { useGraphStyles } from "@/composables/use-graph-style";
import { relationTypeLabels } from "@/composables/use-dictionary";

const props = defineProps<{ applicationId: string }>();
const router = useRouter();
const { renderDiagram } = useMermaid();
const { generateMermaidGraph } = useMermaidGraph();
const { getGraphStyles } = useGraphStyles();
const graphStyles = getGraphStyles();

const graphContainer = ref<HTMLElement | null>(null);
const graphData = ref<RelationGraphDto | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const depth = ref(2);
const maxDepth = 100;
const minDepth = 1;


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

  if (nodes.length === 0) {
    graphContainer.value.innerHTML = "<p class='fr-text--center'>Aucune relation à afficher</p>";
    return;
  }

  const mermaidCode = generateMermaidGraph(nodes, edges, rootId);

  try {
    graphContainer.value.innerHTML = "";
    await renderDiagram(graphContainer.value, mermaidCode);

    nodes.forEach((node) => {
      const nodeEl = graphContainer.value?.querySelector(`#${node.id.replace(/[^a-zA-Z0-9]/g, "_")}`);
      if (nodeEl) nodeEl.addEventListener("click", () => callNodeLink(node.id));
    });
  } catch {
    error.value = "Erreur lors du rendu du graphe";
  }
}


function handleDepthChange() {
  if (depth.value < minDepth) depth.value = minDepth;
  else if (depth.value > maxDepth) depth.value = maxDepth;
  fetchGraphData();
}


watch(graphData, () => renderGraph());

onMounted(() => {
  fetchGraphData();
  const colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  colorSchemeMedia.addEventListener('change', () => {
    if (graphData.value) renderGraph();
  });
});
</script>

<template>
  <div class="relation-graph-wrapper">
    <div class="sidebar">
      <div class="depth-controls">
        <label for="depthRange">Profondeur du graphe : {{ depth }}</label>
        <input
          id="depthRange"
          type="range"
          :min="minDepth"
          :max="maxDepth"
          v-model.number="depth"
          @change="handleDepthChange"
        />
        <input
          type="number"
          :min="minDepth"
          :max="maxDepth"
          v-model.number="depth"
          @change="handleDepthChange"
          class="depth-input"
        />
      </div>

      <div class="legend">
        <h3>Légende des types de relations</h3>
        <ul>
          <li v-for="(label, type) in relationTypeLabels" :key="type">
            <span class="legend-color" :style="{ backgroundColor: graphStyles.edge[type].color }"></span>
            {{ label }}
          </li>
        </ul>
      </div>
    </div>

    <div ref="graphContainer" class="graph-container"></div>
  </div>
</template>

<style scoped>
.relation-graph-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.depth-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.depth-controls label {
  flex-shrink: 0;
  font-weight: 600;
}

.depth-controls input[type="range"] {
  flex-grow: 1;
}

.depth-input {
  width: 3.5rem;
  text-align: center;
}

.graph-container {
  width: 100%;
  min-height: 400px;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: auto;
  background-color: var(--bg-color, #fff);
}

.legend {
  border-top: 1px solid #ccc;
  padding-top: 1rem;
}

.legend h3 {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.legend ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.legend li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.legend-color {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #999;
}

.loading {
  text-align: center;
  font-style: italic;
  color: #666;
}

.error {
  color: red;
  font-weight: 600;
  text-align: center;
}

.relation-graph-wrapper {
  display: flex;
  gap: 1rem;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 250px; /* largeur de la sidebar */
}

.depth-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.depth-controls input[type="range"] {
  width: 100%;
}

.depth-input {
  width: 4rem;
  text-align: center;
}

.legend ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.graph-container {
  flex-grow: 1;
  min-height: 500px;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: auto;
  background-color: var(--bg-color, #fff);
}
</style>