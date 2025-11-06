// composables/useMermaidGraph.ts
import type { GraphEdgeDto, GraphNodeDto } from "@/client";
import { useGraphStyles } from "./use-graph-style";
import { sanitizeLabel, sanitizeNodeId } from "./use-sanitize-utils";

export function useMermaidGraph() {
  const { getGraphStyles } = useGraphStyles();

  function generateMermaidGraph(nodes: GraphNodeDto[], edges: GraphEdgeDto[], rootId: string): string {
    const styles = getGraphStyles();
    let mermaid = "flowchart TD\n";

    // Nodes
    nodes.forEach((node) => {
      const isRoot = node.id === rootId;
      const label = sanitizeLabel(node.label?.trim() || node.id.slice(0, 8));
      const nodeId = sanitizeNodeId(node.id);
      const shape = isRoot ? styles.root.shape : styles.node.shape;
      mermaid += `    ${nodeId}${shape === "ellipse" ? "(\"" : "["}"${label}"${shape === "ellipse" ? "\")" : "]"}`;
      mermaid += isRoot ? ":::root\n" : ":::node\n";
    });

    // Edges
    edges.forEach((edge, index) => {
      const sourceId = sanitizeNodeId(edge.sourceId);
      const targetId = sanitizeNodeId(edge.targetId);
      const edgeStyle = styles.edge[edge.type] || { color: styles.node.stroke, style: "solid" };
      mermaid += `    ${sourceId} --> ${targetId}\n`;
      mermaid += `    linkStyle ${index} stroke:${edgeStyle.color},stroke-width:2px,${edgeStyle.style}\n`;
    });

    // Classes
    mermaid += `    classDef root fill:${styles.root.fill},stroke:${styles.root.stroke},color:${styles.root.text},stroke-width:3px\n`;
    mermaid += `    classDef node fill:${styles.node.fill},stroke:${styles.node.stroke},color:${styles.node.text}\n`;

    return mermaid;
  }

  return { generateMermaidGraph };
}
