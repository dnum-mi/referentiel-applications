import type { RelationGraphDto } from "@/client";

/** Les deux vues décrivent exactement le même réseau, y compris sa racine isolée. */
export function filterRelationGraph(graph: RelationGraphDto, enabledTypes: ReadonlySet<string>): RelationGraphDto {
  const edges = graph.edges.filter((edge) => enabledTypes.has(edge.type));
  const visibleIds = new Set([graph.rootId]);
  for (const edge of edges) {
    visibleIds.add(edge.sourceId);
    visibleIds.add(edge.targetId);
  }
  return { ...graph, edges, nodes: graph.nodes.filter((node) => visibleIds.has(node.id)) };
}
