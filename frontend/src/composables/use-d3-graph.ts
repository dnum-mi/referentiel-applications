import type { GraphEdgeDto, GraphNodeDto } from "@/client";
import * as d3 from "d3";
import { relationTypeLabels, statusApplicationDictionary } from "@/constants/dictionary";
import { useGraphStyles, isDirectedRelation } from "./use-graph-style";

export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  isRoot: boolean;
  status?: string;
}

export interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
  type: GraphEdgeDto["type"];
}

interface GraphAccessibility {
  title: string;
  descriptionId: string;
  detailsId: string;
  nodeHref: (id: string) => string;
}

function nodeName(node: D3Node) {
  const status = node.status && statusApplicationDictionary[node.status as keyof typeof statusApplicationDictionary];
  return [node.label, node.isRoot ? "application racine" : "", status || node.status].filter(Boolean).join(" — ");
}

/** Le nom complet est conservé dans le lien, son titre et la transcription HTML. */
function labelLines(label: string): string[] {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > 21) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines
    .slice(0, 3)
    .map((value, index) => (value.length > 21 || (index === 2 && lines.length > 3) ? `${value.slice(0, 20)}…` : value));
}

export function useD3Graph() {
  const { getGraphStyles } = useGraphStyles();

  function createInteractiveGraph(
    container: HTMLElement,
    nodes: GraphNodeDto[],
    edges: GraphEdgeDto[],
    rootId: string,
    onNodeClick: (nodeId: string) => void,
    _visibleNodeIds?: Set<string>,
    accessibility?: GraphAccessibility,
  ) {
    const styles = getGraphStyles();
    const width = Math.max(container.clientWidth || 800, 600);
    const height = Math.max(container.clientHeight || 600, 600);
    const prefix = (container.id || "relations-graph").replace(/[^\w-]/g, "_");
    d3.select(container).selectAll("*").remove();

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-labelledby", `${prefix}-title`)
      .attr("aria-describedby", [`${prefix}-description`, accessibility?.descriptionId].filter(Boolean).join(" "))
      .attr("aria-details", accessibility?.detailsId || null)
      .style("min-width", "600px")
      .style("cursor", "grab");
    svg
      .append("title")
      .attr("id", `${prefix}-title`)
      .text(accessibility?.title || "Graphe des relations entre applications");
    svg
      .append("desc")
      .attr("id", `${prefix}-description`)
      .text(
        `${nodes.length} applications. ${edges.length} relations. ` +
          nodes
            .map(
              (n) =>
                `${n.label}${n.id === rootId ? " (application racine)" : ""}${n.status ? `, ${statusApplicationDictionary[n.status]}` : ""}`,
            )
            .join(" ; ") +
          ". " +
          edges
            .map(
              (e) =>
                `${e.sourceLabel} ${relationTypeLabels[e.type]} ${e.targetLabel}${isDirectedRelation(e.type) ? "" : " (relation réciproque)"}`,
            )
            .join(" ; ") +
          ". Chaque application est un lien. Majuscule et les flèches déplacent le nœud sélectionné. Les commandes à côté du graphe permettent aussi de déplacer chaque nœud, de zoomer et de déplacer la vue. La liste complète avec les liens des applications est disponible après le graphe.",
      );

    const defs = svg.append("defs");
    for (const [type, style] of Object.entries(styles.edge)) {
      defs
        .append("marker")
        .attr("id", `${prefix}-arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", styles.node.width / 2 + 10)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto-start-reverse")
        .attr("markerUnits", "userSpaceOnUse")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", style.color);
    }

    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .extent([
        [0, 0],
        [width, height],
      ])
      .scaleExtent([0.25, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom).on("dblclick.zoom", null);

    const d3Nodes: D3Node[] = nodes.map((node) => ({
      id: node.id,
      label: node.label?.trim() || node.id,
      isRoot: node.id === rootId,
      status: node.status,
    }));
    const d3Links: D3Link[] = edges.map((edge) => ({ source: edge.sourceId, target: edge.targetId, type: edge.type }));

    // Calculer une disposition stable avant affichage évite un mouvement automatique continu.
    const simulation = d3
      .forceSimulation(d3Nodes)
      .stop()
      .force(
        "link",
        d3
          .forceLink<D3Node, D3Link>(d3Links)
          .id((node) => node.id)
          .distance(240),
      )
      .force("charge", d3.forceManyBody().strength(-500))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<D3Node>().radius(styles.root.width / 2 + 12));
    simulation.tick(200);

    const link = g
      .append("g")
      .attr("aria-hidden", "true")
      .selectAll("line")
      .data(d3Links)
      .join("line")
      .attr("stroke-width", (d) => styles.edge[d.type].width)
      .attr("stroke", (d) => styles.edge[d.type].color)
      .attr("stroke-dasharray", (d) => styles.edge[d.type].dasharray)
      .attr("marker-end", (d) => (isDirectedRelation(d.type) ? `url(#${prefix}-arrow-${d.type})` : null));

    const edgeLabels = g
      .append("g")
      .attr("aria-hidden", "true")
      .selectAll("text")
      .data(d3Links)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "var(--text-default-grey)")
      .attr("stroke", "var(--background-default-grey)")
      .attr("stroke-width", 5)
      .attr("paint-order", "stroke")
      .attr("pointer-events", "none")
      .text((d) => relationTypeLabels[d.type]);

    const node = g
      .append("g")
      .selectAll<SVGAElement, D3Node>("a")
      .data(d3Nodes)
      .join<SVGAElement>("a")
      .attr(
        "href",
        (d) => accessibility?.nodeHref(d.id) || `${import.meta.env.BASE_URL.replace(/\/$/, "")}/applications/${encodeURIComponent(d.id)}`,
      )
      .attr("tabindex", 0)
      .attr("aria-label", nodeName)
      .attr("data-node-id", (d) => d.id)
      .attr("cursor", "pointer")
      .call(
        d3.drag<SVGAElement, D3Node>().on("drag", (event, d) => {
          d.x = event.x;
          d.y = event.y;
          updatePositions();
        }),
      );
    node.append("title").text(nodeName);
    const nodeRect = node
      .append("rect")
      .attr("aria-hidden", "true")
      .attr("width", (d) => (d.isRoot ? styles.root.width : styles.node.width))
      .attr("height", (d) => (d.isRoot ? styles.root.height : styles.node.height))
      .attr("x", (d) => -(d.isRoot ? styles.root.width : styles.node.width) / 2)
      .attr("y", (d) => -(d.isRoot ? styles.root.height : styles.node.height) / 2)
      .attr("fill", (d) => (d.isRoot ? styles.root.fill : styles.node.fill))
      .attr("stroke", (d) => (d.isRoot ? styles.root.stroke : styles.node.stroke))
      .attr("stroke-width", 2);
    node
      .append("text")
      .attr("aria-hidden", "true")
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", styles.node.text)
      .attr("pointer-events", "none")
      .attr("font-weight", (d) => (d.isRoot ? "bold" : "normal"))
      .each(function (d) {
        labelLines(d.label).forEach((line, i) =>
          d3
            .select(this)
            .append("tspan")
            .attr("x", 0)
            .attr("y", -20 + i * 16)
            .text(line),
        );
      });
    node
      .filter((d) => Boolean(d.status))
      .append("text")
      .attr("aria-hidden", "true")
      .attr("text-anchor", "middle")
      .attr("y", 34)
      .attr("font-size", "13px")
      .attr("fill", styles.node.text)
      .attr("pointer-events", "none")
      .text((d) => statusApplicationDictionary[d.status as keyof typeof statusApplicationDictionary] || d.status || "");

    node
      .on("click", (event: MouseEvent, d) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        event.stopPropagation();
        onNodeClick(d.id);
      })
      .on("keydown", (event: KeyboardEvent, d) => {
        const moves: Record<string, [number, number]> = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
        const move = moves[event.key];
        if (event.shiftKey && move) {
          event.preventDefault();
          event.stopPropagation();
          moveNode(d.id, move[0], move[1]);
        }
      })
      .on("focus mouseenter", function () {
        d3.select(this).select("rect").attr("stroke-width", 4).attr("stroke", "var(--border-action-high-blue-france)");
      })
      .on("blur mouseleave", function () {
        if (document.activeElement === this) return;
        nodeRect.attr("stroke-width", 2).attr("stroke", (d) => (d.isRoot ? styles.root.stroke : styles.node.stroke));
      });

    function updatePositions() {
      link
        .attr("x1", (d) => (d.source as D3Node).x ?? 0)
        .attr("y1", (d) => (d.source as D3Node).y ?? 0)
        .attr("x2", (d) => (d.target as D3Node).x ?? 0)
        .attr("y2", (d) => (d.target as D3Node).y ?? 0);
      edgeLabels
        .attr("x", (d) => (((d.source as D3Node).x ?? 0) + ((d.target as D3Node).x ?? 0)) / 2)
        .attr("y", (d) => (((d.source as D3Node).y ?? 0) + ((d.target as D3Node).y ?? 0)) / 2 - 6);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    }

    function moveNode(id: string, dx: number, dy: number) {
      const target = d3Nodes.find((item) => item.id === id);
      if (!target) return;
      target.x = (target.x ?? 0) + dx;
      target.y = (target.y ?? 0) + dy;
      updatePositions();
    }
    updatePositions();

    return {
      cleanup: () => {
        simulation.stop();
        svg.on(".zoom", null);
        svg.remove();
      },
      resetZoom: () => svg.call(zoom.transform, d3.zoomIdentity),
      zoomIn: () => svg.call(zoom.scaleBy, 1.25),
      zoomOut: () => svg.call(zoom.scaleBy, 0.8),
      pan: (dx: number, dy: number) => svg.call(zoom.translateBy, dx, dy),
      moveNode,
      exportSVG: () => {
        const element = svg.node();
        if (!element) return;
        const clone = element.cloneNode(true) as SVGSVGElement;
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("aria-describedby", `${prefix}-description`);
        clone.removeAttribute("aria-details");
        // Résoudre les couleurs du thème pour un SVG utilisable hors de l'application.
        const originalChildren = [element, ...element.querySelectorAll("*")];
        const clonedChildren = [clone, ...clone.querySelectorAll("*")];
        originalChildren.forEach((original, i) => {
          const computed = getComputedStyle(original);
          for (const name of ["fill", "stroke"]) {
            if (original.getAttribute(name)?.includes("var(")) clonedChildren[i]?.setAttribute(name, computed.getPropertyValue(name));
          }
        });
        const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        background.setAttribute("width", "100%");
        background.setAttribute("height", "100%");
        background.setAttribute("fill", getComputedStyle(container).backgroundColor);
        background.setAttribute("aria-hidden", "true");
        clone.insertBefore(background, clone.querySelector("g"));
        clone.style.fontFamily = getComputedStyle(element).fontFamily;
        for (const anchor of clone.querySelectorAll("a[href]")) {
          anchor.setAttribute("href", new URL(anchor.getAttribute("href")!, globalThis.location.href).href);
        }
        const serialized = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
        const url = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }));
        const download = document.createElement("a");
        download.href = url;
        download.download = `graph-relations-${new Date().toISOString().slice(0, 10)}.svg`;
        document.body.appendChild(download);
        download.click();
        download.remove();
        URL.revokeObjectURL(url);
      },
    };
  }
  return { createInteractiveGraph };
}
