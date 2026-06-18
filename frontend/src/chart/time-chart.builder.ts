import type { TechnicalDebtPoint } from "@/composables/use-application-search";
import { TRESHOLD_TIME_MATURITY } from "@/utils/get-time-quadrant";
import * as d3 from "d3";

type GSelection = d3.Selection<SVGGElement, unknown, null, undefined>;
type SvgSelection = d3.Selection<SVGSVGElement, unknown, null, undefined>;

export interface ChartScales {
  x: d3.ScaleLinear<number, number>;
  y: d3.ScaleLinear<number, number>;
  color: d3.ScaleSequential<string, never>;
  radius: d3.ScaleLinear<number, number>;
}

interface ChartLayout {
  plotWidth: number;
  plotHeight: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export class TimeChartBuilder {
  private tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null;

  constructor(
    private g: GSelection,
    private svg: SvgSelection,
    private root: HTMLDivElement,
    private scales: ChartScales,
    private layout: ChartLayout,
    private data: TechnicalDebtPoint[],
  ) {}

  /** Titre principal en haut au centre */
  drawTitle(): this {
    const { plotWidth, margin } = this.layout;
    this.g
      .append("text")
      .attr("x", plotWidth / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "var(--blue-france-sun-113-625)")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .text("Portefeuille");
    return this;
  }

  /** Axes X et Y qui se croisent au centre du domaine (2.5, 2.5) */
  drawAxes(): this {
    const { x, y } = this.scales;
    const { plotWidth, plotHeight, margin } = this.layout;

    // Contour carré autour de la zone du graphe
    this.g
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", plotWidth)
      .attr("height", plotHeight)
      .attr("fill", "none")
      .attr("stroke", "currentColor")
      .attr("stroke-width", 1);

    const xAxis = d3
      .axisBottom(x)
      .ticks(5)
      .tickFormat((d) => `${d}`);
    const yAxis = d3
      .axisLeft(y)
      .ticks(5)
      .tickFormat((d) => `${d}`);

    this.g
      .append("g")
      .attr("transform", `translate(0,${y(TRESHOLD_TIME_MATURITY)})`)
      .call(xAxis);

    this.g
      .append("g")
      .attr("transform", `translate(${x(TRESHOLD_TIME_MATURITY)},0)`)
      .call(yAxis);

    return this;
  }

  /** Labels TIME dans les 4 coins : Tolerate / Invest / Eliminate / Migrate */
  drawQuadrants(): this {
    const { plotWidth, plotHeight } = this.layout;
    const gap = 15;

    const quadrants = [
      { tx: 0 + gap, ty: 0 + gap, anchor: "start", baseline: "hanging", label: "Tolérer" },
      { tx: plotWidth - gap, ty: 0 + gap, anchor: "end", baseline: "hanging", label: "A privilégier" },
      { tx: 0 + gap, ty: plotHeight - gap, anchor: "start", baseline: "auto", label: "A décommissionner" },
      { tx: plotWidth - gap, ty: plotHeight - gap, anchor: "end", baseline: "auto", label: "A Migrer" },
    ] as const;

    quadrants.forEach(({ tx, ty, anchor, baseline, label }) => {
      this.g
        .append("text")
        .attr("x", tx)
        .attr("y", ty)
        .attr("text-anchor", anchor)
        .attr("dominant-baseline", baseline)
        .attr("fill", "var(--blue-france-sun-113-625)")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text(label);
    });

    return this;
  }

  /**
   * Légendes des axes hors plot area :
   * - bas    : Pire · Maturité métier · Meilleur
   * - gauche : Pire (bas) · Maturité technique (milieu) · Meilleur (haut) — perpendiculaires
   */
  drawAxisLegends(): this {
    const { plotWidth, plotHeight } = this.layout;

    // Axe horizontal (bas)
    this.g
      .append("text")
      .attr("x", 0)
      .attr("y", plotHeight + 30)
      .attr("text-anchor", "start")
      .attr("fill", "currentColor")
      .attr("font-size", "11px")
      .attr("font-style", "italic")
      .text("Pire");

    this.g
      .append("text")
      .attr("x", plotWidth / 2)
      .attr("y", plotHeight + 55)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", "13px")
      .attr("font-weight", "bold")
      .text("Maturité métier");

    this.g
      .append("text")
      .attr("x", plotWidth)
      .attr("y", plotHeight + 30)
      .attr("text-anchor", "end")
      .attr("fill", "currentColor")
      .attr("font-size", "11px")
      .attr("font-style", "italic")
      .text("Meilleur");

    // Axe vertical (gauche) — perpendiculaire
    // rotate(-90) + translate : text-anchor "start" = part vers le haut / "end" = vers le bas
    this.g
      .append("text")
      .attr("transform", `translate(-30,${plotHeight}) rotate(-90)`)
      .attr("text-anchor", "start")
      .attr("fill", "currentColor")
      .attr("font-size", "11px")
      .attr("font-style", "italic")
      .text("Pire");

    this.g
      .append("text")
      .attr("transform", `translate(-30,0) rotate(-90)`)
      .attr("text-anchor", "end")
      .attr("fill", "currentColor")
      .attr("font-size", "11px")
      .attr("font-style", "italic")
      .text("Meilleur");

    this.g
      .append("text")
      .attr("transform", `translate(-55,${plotHeight / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", "13px")
      .attr("font-weight", "bold")
      .text("Maturité technique");

    return this;
  }

  /**
   * Bulles du scatter plot :
   * - cx / cy : position selon maturité technique (x) et métier (y)
   * - r       : taille selon coût MCO
   * - fill    : couleur selon coût MCO (jaune → rouge)
   * Crée aussi le tooltip HTML affiché au survol.
   */
  drawBubbles(): this {
    const { x, y, color, radius } = this.scales;

    // Tooltip HTML flottant (créé ici car utilisé par les events des bulles)
    this.tooltip = d3
      .select(this.root)
      .append("div")
      .attr("class", "td-tooltip fr-p-1w fr-text--sm")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("background", "var(--background-raised-grey, #f6f6f6)")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.08)")
      .style("display", "none");

    const tooltip = this.tooltip;

    this.g
      .selectAll("circle")
      .data(this.data)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.technicalDebtInfo?.businessMaturity ?? 0))
      .attr("cy", (d) => y(d.technicalDebtInfo?.technicalMaturity ?? 0))
      .attr("r", (d) => radius(d.technicalDebtInfo?.costMaturity ?? 0))
      .attr("fill", (d) => color(d.technicalDebtInfo?.costMaturity ?? 0))
      .attr("opacity", 0.9)
      .attr("stroke", "#9F0126")
      .attr("stroke-width", 0.6)
      .attr("cursor", "pointer")
      .attr("data-testid", "technical-debt-point")
      .on("mouseenter", (_, d) => {
        tooltip
          .style("display", "block")
          .html(
            `<strong>${d.label}</strong> ${d.shortName ? `(<em>${d.shortName}<em/>)` : ""}<br/>` +
              `Technique: ${d.technicalDebtInfo?.technicalMaturity ?? "-"}<br/>` +
              `Metier: ${d.technicalDebtInfo?.businessMaturity ?? "-"}<br/>` +
              `Coût MCO: ${d.technicalDebtInfo?.costMaturity ?? "-"}`,
          );
      })
      .on("mousemove", (event) => {
        tooltip.style("left", `${event.offsetX + 12}px`).style("top", `${event.offsetY + 12}px`);
      })
      .on("mouseleave", () => {
        tooltip.style("display", "none");
      })
      .on("click", (_, d) => {
        window.location.href = `http://localhost:5173/applications/${d.id}`;
      });

    return this;
  }

  /** Barre de dégradé couleur MCO en bas à droite (jaune → rouge, valeurs 0-5) */
  drawColorLegend(): this {
    const { color } = this.scales;
    const { plotWidth, plotHeight } = this.layout;

    const legendWidth = 180;
    const legendHeight = 8;
    const legend = this.g.append("g").attr("transform", `translate(${plotWidth - legendWidth},${plotHeight + 35})`);

    const gradientId = "cost-gradient";
    const defs = this.svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", color(0));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", color(5));

    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("fill", `url(#${gradientId})`)
      .attr("rx", 2)
      .attr("ry", 2);

    const legendAxis = d3
      .axisBottom(d3.scaleLinear().domain([0, 5]).range([0, legendWidth]))
      .ticks(5)
      .tickFormat((d) => `${d}`)
      .tickSize(legendHeight);

    legend
      .append("g")
      .attr("transform", `translate(0,${legendHeight})`)
      .call(legendAxis)
      .call((axis) => axis.select(".domain").remove())
      .call((axis) =>
        axis
          .append("text")
          .attr("x", legendWidth)
          .attr("y", legendHeight + 25)
          .attr("text-anchor", "end")
          .attr("fill", "currentColor")
          .attr("font-size", "12px")
          .text("Cout du MCO"),
      );

    return this;
  }
}
