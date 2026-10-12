<script setup lang="ts">
import type { RelationGraphDto } from "@/client";
import { relationTypeLabels, statusApplicationDictionary } from "@/constants/dictionary";
import { isDirectedRelation } from "@/composables/use-graph-style";

defineProps<{ graph: RelationGraphDto; depth: number; id: string }>();
</script>

<template>
  <section :id="id" class="graph-transcription" tabindex="-1" :aria-labelledby="`${id}-title`" data-testid="relations-graph-transcription">
    <h4 :id="`${id}-title`">Liste complète du réseau de relations — profondeur {{ depth }}</h4>
    <p>
      Les applications et relations ci-dessous correspondent au graphe et aux types de relation sélectionnés. Les flèches vont de la source
      vers la cible ; les corrélations sont réciproques.
    </p>
    <h5>Applications du réseau ({{ graph.nodes.length }})</h5>
    <ul>
      <li v-for="node in graph.nodes" :key="node.id">
        <RouterLink :to="{ name: 'application', params: { id: node.id } }">{{ node.label || node.id }}</RouterLink>
        <span v-if="node.id === graph.rootId"> — application racine</span>
        <span v-if="node.status"> — {{ statusApplicationDictionary[node.status] || node.status }}</span>
      </li>
    </ul>
    <section v-if="graph.edges.length" class="fr-table graph-table" :aria-label="`Relations du réseau, profondeur ${depth}`" tabindex="0">
      <table>
        <caption>
          Relations du réseau — profondeur
          {{
            depth
          }}
          ({{
            graph.edges.length
          }}
          relations)
        </caption>
        <thead>
          <tr>
            <th scope="col">Application source</th>
            <th scope="col">Relation</th>
            <th scope="col">Application cible</th>
            <th scope="col">Direction</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="edge in graph.edges" :key="edge.id">
            <th scope="row">
              <RouterLink :to="{ name: 'application', params: { id: edge.sourceId } }">{{ edge.sourceLabel || edge.sourceId }}</RouterLink>
            </th>
            <td>{{ relationTypeLabels[edge.type] || edge.type }}</td>
            <td>
              <RouterLink :to="{ name: 'application', params: { id: edge.targetId } }">{{ edge.targetLabel || edge.targetId }}</RouterLink>
            </td>
            <td>{{ isDirectedRelation(edge.type) ? "Source vers cible" : "Réciproque, sans direction" }}</td>
          </tr>
        </tbody>
      </table>
    </section>
    <p v-else>Aucune relation à afficher pour les types sélectionnés.</p>
  </section>
</template>

<style scoped>
.graph-transcription {
  min-width: 0;
  overflow-wrap: anywhere;
}
.graph-table {
  max-width: 100%;
  overflow: auto;
}
.graph-table table {
  min-width: min(40rem, 100%);
  width: 100%;
}
.graph-table caption {
  text-align: left;
  font-weight: 700;
  margin-bottom: 1rem;
}
.graph-table th,
.graph-table td {
  white-space: normal;
}
</style>
