import type { GraphEdgeDto, GraphNodeDto } from "@/client";
import * as d3 from "d3";
import { statusApplicationDictionary } from "./use-dictionary";
import { useGraphStyles } from "./use-graph-style";
import { sanitizeLabel } from "./use-sanitize-utils";

export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  isRoot: boolean;
  status?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  type: string;
}

export function useD3Graph() {
  const { getGraphStyles } = useGraphStyles();

  // Constants for node masking
  const MASKED_NODE_OPACITY = 0.05;

  function createInteractiveGraph(
    container: HTMLElement,
    nodes: GraphNodeDto[],
    edges: GraphEdgeDto[],
    rootId: string,
    onNodeClick: (nodeId: string) => void,
    visibleNodeIds?: Set<string>,
  ) {
    const styles = getGraphStyles();
    const width = container.clientWidth || 800;
    const height = Math.max(container.clientHeight || 600, 600);

    d3.select(container).selectAll("*").remove();

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("style", "max-width: 100%; height: auto; cursor: grab;");

    const defs = svg.append("defs");

    const edgeStyles = styles.edge as Record<string, { color: string; style: string; width: number }>;

    Object.keys(edgeStyles).forEach((type) => {
      const safeType = type.replace(/[^\w-]/g, "_");
      const color = edgeStyles[type]?.color || styles.node.stroke;

      defs
        .append("marker")
        .attr("id", `arrow-${safeType}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", styles.node.width / 2 + 10)
        .attr("refY", 0)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto-start-reverse")
        .attr("markerUnits", "strokeWidth")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    });

    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const d3Nodes: D3Node[] = nodes.map((node) => ({
      id: node.id,
      label: sanitizeLabel(node.label?.trim() || node.id.slice(0, 8)),
      isRoot: node.id === rootId,
      status: node.status,
    }));

    const d3Links: D3Link[] = edges.map((edge) => ({
      source: edge.sourceId,
      target: edge.targetId,
      type: edge.type,
    }));

    const simulation = d3
      .forceSimulation<D3Node>(d3Nodes)
      .force(
        "link",
        d3
          .forceLink<D3Node, D3Link>(d3Links)
          .id((d) => d.id)
          .distance(150),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(styles.root.width / 2 + 10));

    const link = g
      .append("g")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(d3Links)
      .join("line")
      .attr("stroke-width", (d) => edgeStyles[d.type]?.width || 2)
      .attr("stroke", (d) => edgeStyles[d.type]?.color || styles.node.stroke)
      .attr("stroke-dasharray", (d) => {
        if (edgeStyles[d.type]?.style === "dashed") return "6, 4";
        if (edgeStyles[d.type]?.style === "dotted") return "2, 3";
        return "0";
      })
      .attr("marker-end", (d) => {
        const safeType = (d.type || "").replace(/[^\w-]/g, "_");
        return `url(#arrow-${safeType})`;
      });

    const node = g
      .append("g")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round")
      .selectAll<SVGGElement, D3Node>("g")
      .data(d3Nodes)
      .join("g")
      .attr("cursor", "pointer")
      .style("opacity", (d) => {
        if (!visibleNodeIds || visibleNodeIds.size === 0) return 1;
        return visibleNodeIds.has(d.id) ? 1 : MASKED_NODE_OPACITY;
      })
      .style("pointer-events", (d) => {
        if (!visibleNodeIds || visibleNodeIds.size === 0) return "auto";
        return visibleNodeIds.has(d.id) ? "auto" : "none";
      })
      .call(d3.drag<SVGGElement, D3Node>().on("start", dragstarted).on("drag", dragged).on("end", dragended));

    // Add rectangles for nodes
    node
      .append("rect")
      .attr("width", (d) => (d.isRoot ? styles.root.width : styles.node.width))
      .attr("height", (d) => (d.isRoot ? styles.root.height : styles.node.height))
      .attr("x", (d) => (d.isRoot ? -styles.root.width / 2 : -styles.node.width / 2))
      .attr("y", (d) => (d.isRoot ? -styles.root.height / 2 : -styles.node.height / 2))
      .attr("rx", (d) => (d.isRoot ? styles.root.borderRadius : styles.node.borderRadius))
      .attr("ry", (d) => (d.isRoot ? styles.root.borderRadius : styles.node.borderRadius))
      .attr("fill", (d) => (d.isRoot ? styles.root.fill : styles.node.fill))
      .attr("stroke", (d) => (d.isRoot ? styles.root.stroke : styles.node.stroke))
      .attr("stroke-width", (d) => (d.isRoot ? 3 : 2));

    // Cache for text layout calculations
    const textLayoutCache = new Map<string, { lines: string[]; fontSize: number; totalHeight: number }>();

    function getTextLayout(
      label: string,
      isRoot: boolean,
      status: string | undefined,
      styles: any,
      textElem: SVGTextElement,
    ): { lines: string[]; fontSize: number; totalHeight: number } {
      const cacheKey = JSON.stringify([label, isRoot, status]);
      if (textLayoutCache.has(cacheKey)) {
        return textLayoutCache.get(cacheKey)!;
      }
      const maxTextWidth = isRoot ? styles.root.width - 10 : styles.node.width - 10;
      const maxHeight = isRoot ? styles.root.height - 20 : styles.node.height - 20;
      const words = label.split(/\s+/);
      const lineHeight = 1.1;
      let fontSize = 11;
      const minFontSize = 6;
      let maxLines = Math.floor(maxHeight / fontSize / lineHeight);
      const lines: string[] = [];
      let line = "";
      let lineNumber = 0;

      // Create a temporary tspan for measurement
      const text = d3.select(textElem);
      text.text("");
      let tspan = text.append("tspan").attr("x", 0).attr("dy", "0em").text("");

      for (const word of words) {
        const testLine = line + (line === "" ? "" : " ") + word;
        tspan.text(testLine);
        if (tspan.node()!.getComputedTextLength() > maxTextWidth && line !== "") {
          lines.push(line);
          lineNumber++;
          if (lineNumber >= maxLines) {
            lines[lines.length - 1] = `${line}…`;
            break;
          }
          tspan = text.append("tspan").attr("x", 0).attr("dy", `${lineHeight}em`).text(word);
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line && lines.length < maxLines) {
        lines.push(line);
      }

      // Adjust font size if needed
      text.attr("font-size", `${fontSize}px`);
      while (text.node()!.getBBox().width > maxTextWidth && fontSize > minFontSize) {
        fontSize--;
        text.attr("font-size", `${fontSize}px`);
        maxLines = Math.floor(maxHeight / fontSize / lineHeight);
      }
      // Remove all tspans after measurement
      text.selectAll("tspan").remove();
      const totalHeight = (lines.length - 1) * lineHeight;
      const result = { lines, fontSize, totalHeight };
      textLayoutCache.set(cacheKey, result);
      return result;
    }

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("font-weight", (d) => (d.isRoot ? "bold" : "normal"))
      .attr("fill", (d) => (d.isRoot ? styles.root.text : styles.node.text))
      .attr("pointer-events", "none")
      .each(function (d) {
        const text = d3.select(this);
        // Use memoized layout calculation
        const { lines, fontSize, totalHeight } = getTextLayout(d.label, d.isRoot, d.status, styles, this as SVGTextElement);
        text.attr("font-size", `${fontSize}px`);
        text.text("");
        lines.forEach((line, i) => {
          text
            .append("tspan")
            .attr("x", 0)
            .attr("dy", i === 0 ? "0em" : "1.1em")
            .text(line);
        });
        // Adjust dy based on status and totalHeight
        text.attr("dy", d.status ? `-${totalHeight / 2 - 0.6}em` : `-${totalHeight / 2}em`);
        text.append("title").text(d.label);
      });

    node
      .filter((d) => d.status)
      .append("text")
      .text((d) => {
        const statusLabel =
          d.status && d.status in statusApplicationDictionary
            ? statusApplicationDictionary[d.status as keyof typeof statusApplicationDictionary]
            : d.status;
        return statusLabel || "";
      })
      .attr("text-anchor", "middle")
      .attr("dy", "-1.2em")
      .attr("font-size", "9px")
      .attr("font-style", "italic")
      .attr("fill", (d) => (d.isRoot ? styles.root.text : styles.node.text))
      .attr("opacity", 0.8)
      .attr("pointer-events", "none");

    node.on("click", (event, d) => {
      event.stopPropagation();
      onNodeClick(d.id);
    });

    node
      .on("mouseenter", function () {
        d3.select(this).select("rect").attr("stroke-width", 4).attr("stroke", "var(--border-action-high-blue-france, #000091)");
      })
      .on("mouseleave", function (event, d) {
        d3.select(this)
          .select("rect")
          .attr("stroke-width", d.isRoot ? 3 : 2)
          .attr("stroke", d.isRoot ? styles.root.stroke : styles.node.stroke);
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as D3Node).x ?? 0)
        .attr("y1", (d) => (d.source as D3Node).y ?? 0)
        .attr("x2", (d) => (d.target as D3Node).x ?? 0)
        .attr("y2", (d) => (d.target as D3Node).y ?? 0);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      svg.style("cursor", "grabbing");
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
      svg.style("cursor", "grab");
    }

    return {
      cleanup: () => {
        simulation.stop();
        d3.select(container).selectAll("*").remove();
      },
      resetZoom: () => {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
      },
      exportSVG: () => {
        const svgElement = svg.node();
        if (!svgElement) return;

        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgElement);

        if (!svgString.match(/^<\?xml/)) {
          svgString = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${svgString}`;
        }

        if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
          svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const styleElement = `
          <style>
            text { font-family: "Marianne", arial, sans-serif; }
          </style>
        `;

        if (svgString.includes("</defs>")) {
          svgString = svgString.replace("</defs>", `${styleElement}</defs>`);
        } else if (svgString.includes("<defs>")) {
          svgString = svgString.replace("<defs>", `<defs>${styleElement}`);
        } else {
          svgString = svgString.replace("<svg", `<svg><defs>${styleElement}</defs>`);
        }

        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `graph-relations-${new Date().toISOString().slice(0, 10)}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
    };
  }

  return {
    createInteractiveGraph,
  };
}
