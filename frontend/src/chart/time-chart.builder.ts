import type { TechnicalDebtPoint } from "@/composables/use-application-search";
import { TimeQuadrantWording, TRESHOLD_TIME_MATURITY } from "@/utils/get-time-quadrant";
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
  private disposeInteractions: (() => void) | null = null;

  constructor(
    private readonly g: GSelection,
    private readonly svg: SvgSelection,
    private readonly root: HTMLDivElement,
    private readonly scales: ChartScales,
    private readonly layout: ChartLayout,
    private readonly data: TechnicalDebtPoint[],
  ) {}

  destroy() {
    this.disposeInteractions?.();
    this.disposeInteractions = null;
    this.tooltip?.remove();
    this.tooltip = null;
  }

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
    const { plotWidth, plotHeight } = this.layout;

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
      .call(xAxis)
      .attr("font-size", "12px");

    this.g
      .append("g")
      .attr("transform", `translate(${x(TRESHOLD_TIME_MATURITY)},0)`)
      .call(yAxis)
      .attr("font-size", "12px");

    return this;
  }

  /** Labels TIME dans les 4 coins : Tolerate / Invest / Eliminate / Migrate */
  drawQuadrants(): this {
    const { plotWidth, plotHeight } = this.layout;
    const gap = 15;

    const quadrants = [
      { tx: 0 + gap, ty: 0 + gap, anchor: "start", baseline: "hanging", label: TimeQuadrantWording.Tolerate },
      { tx: plotWidth - gap, ty: 0 + gap, anchor: "end", baseline: "hanging", label: TimeQuadrantWording.Invest },
      { tx: 0 + gap, ty: plotHeight - gap, anchor: "start", baseline: "auto", label: TimeQuadrantWording.Eliminate },
      { tx: plotWidth - gap, ty: plotHeight - gap, anchor: "end", baseline: "auto", label: TimeQuadrantWording.Migrate },
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
      .attr("font-size", "14px")
      .attr("font-style", "italic")
      .text("Pire");

    this.g
      .append("text")
      .attr("x", plotWidth / 2)
      .attr("y", plotHeight + 55)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Maturité métier");

    this.g
      .append("text")
      .attr("x", plotWidth)
      .attr("y", plotHeight + 30)
      .attr("text-anchor", "end")
      .attr("fill", "currentColor")
      .attr("font-size", "14px")
      .attr("font-style", "italic")
      .text("Meilleur");

    // Axe vertical (gauche) — perpendiculaire
    // rotate(-90) + translate : text-anchor "start" = part vers le haut / "end" = vers le bas
    this.g
      .append("text")
      .attr("transform", `translate(-30,${plotHeight}) rotate(-90)`)
      .attr("text-anchor", "start")
      .attr("fill", "currentColor")
      .attr("font-size", "14px")
      .attr("font-style", "italic")
      .text("Pire");

    this.g
      .append("text")
      .attr("transform", `translate(-30,0) rotate(-90)`)
      .attr("text-anchor", "end")
      .attr("fill", "currentColor")
      .attr("font-size", "14px")
      .attr("font-style", "italic")
      .text("Meilleur");

    this.g
      .append("text")
      .attr("transform", `translate(-55,${plotHeight / 2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Maturité technique");

    return this;
  }

  /**
   * Bulles du scatter plot :
   * - cx / cy : position selon maturité technique (x) et métier (y)
   * - r       : taille selon maîtrise des coûts MCO
   * - fill    : couleur selon maîtrise des coûts MCO (jaune → rouge)
   * Crée aussi le tooltip HTML affiché au survol.
   */
  drawBubbles(): this {
    const { x, y, color, radius } = this.scales;
    this.destroy();
    const tooltipId = `${this.svg.attr("id") || "time-chart"}-tooltip`;
    this.tooltip = d3
      .select(this.root)
      .append("div")
      .attr("id", tooltipId)
      .attr("role", "tooltip")
      .attr("class", "td-tooltip fr-p-1w fr-text--sm")
      .style("position", "absolute")
      .style("pointer-events", "auto")
      .style("z-index", "10")
      .style("background", "var(--background-raised-grey, #f6f6f6)")
      .style("color", "var(--text-default-grey)")
      .style("border", "1px solid var(--text-mention-grey)")
      .style("border-radius", "4px")
      .style("box-shadow", "0 4px 12px rgba(0,0,0,0.08)")
      .style("display", "none")
      .style("max-width", "min(22rem, calc(100% - 16px))")
      .style("overflow-wrap", "anywhere")
      .style("white-space", "normal");
    const tooltip = this.tooltip;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let activePoint: SVGAElement | null = null;
    let hoveredPoint: { element: SVGAElement; data: TechnicalDebtPoint } | null = null;
    let pointerOnTooltip = false;
    let focusedPoint: { element: SVGAElement; data: TechnicalDebtPoint } | null = null;
    let dismissed = false;
    const shouldKeep = () =>
      Boolean(activePoint && (pointerOnTooltip || hoveredPoint?.element === activePoint || focusedPoint?.element === activePoint));
    const cancelHide = () => {
      clearTimeout(hideTimer);
    };
    const hide = () => {
      cancelHide();
      tooltip.style("display", "none");
      activePoint?.removeAttribute("aria-describedby");
    };
    const hideLater = () => {
      cancelHide();
      if (!shouldKeep()) {
        // Permet de traverser l'espace entre la bulle et son infobulle.
        hideTimer = setTimeout(() => {
          if (shouldKeep()) return;
          const remainingTrigger = focusedPoint || hoveredPoint;
          if (remainingTrigger && !dismissed) show(remainingTrigger.element, remainingTrigger.data);
          else hide();
        }, 200);
      }
    };
    const values = (d: TechnicalDebtPoint) =>
      `Maturité technique : ${d.technicalDebtInfo?.technicalMaturity ?? "non renseignée"}. Maturité métier : ${d.technicalDebtInfo?.businessMaturity ?? "non renseignée"}. Maîtrise des coûts MCO : ${d.technicalDebtInfo?.costContainment ?? "non renseignée"}.`;
    const costValue = (d: TechnicalDebtPoint) => {
      const cost = d.technicalDebtInfo?.costContainment;
      return typeof cost === "number" && Number.isFinite(cost) ? cost : null;
    };
    const show = (point: SVGAElement, d: TechnicalDebtPoint) => {
      dismissed = false;
      cancelHide();
      if (activePoint !== point) activePoint?.removeAttribute("aria-describedby");
      activePoint = point;
      point.setAttribute("aria-describedby", tooltipId);
      tooltip.selectAll("*").remove();
      tooltip.append("strong").text(d.label);
      if (d.shortName && d.shortName !== d.label) tooltip.append("div").text(d.shortName);
      tooltip.append("div").text(values(d));
      tooltip.append("div").text("Échap pour fermer. Entrée ouvre la fiche de l’application.");
      tooltip.style("display", "block");
      const rootRect = this.root.getBoundingClientRect();
      const pointRect = point.getBoundingClientRect();
      const tooltipRect = tooltip.node()!.getBoundingClientRect();
      const availableWidth = this.root.clientWidth || rootRect.width;
      const left = Math.max(8, Math.min(pointRect.left - rootRect.left + 12, availableWidth - tooltipRect.width - 8));
      tooltip.style("left", `${left}px`).style("top", `${Math.max(8, pointRect.bottom - rootRect.top + 8)}px`);
    };
    tooltip
      .on("mouseenter", () => {
        pointerOnTooltip = true;
        cancelHide();
      })
      .on("mouseleave", () => {
        pointerOnTooltip = false;
        hideLater();
      });
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && tooltip.style("display") !== "none") {
        event.preventDefault();
        event.stopPropagation();
        dismissed = true;
        hide();
      }
    };
    document.addEventListener("keydown", onEscape, true);
    this.disposeInteractions = () => {
      cancelHide();
      document.removeEventListener("keydown", onEscape, true);
    };

    const points = this.g
      .append("g")
      .selectAll<SVGAElement, TechnicalDebtPoint>("a")
      .data(this.data)
      .join<SVGAElement>("a")
      .attr("href", (d) => `${import.meta.env.BASE_URL.replace(/\/$/, "")}/applications/${encodeURIComponent(d.id)}`)
      .attr("tabindex", 0)
      .attr("data-application-id", (d) => d.id)
      .attr("aria-label", (d) => {
        const shortName = d.shortName && d.shortName !== d.label ? ` (${d.shortName})` : "";
        return `${d.label}${shortName}. ${values(d)} Ouvrir la fiche de l’application.`;
      })
      .on("mouseenter", function (_, d) {
        hoveredPoint = { element: this, data: d };
        show(this, d);
      })
      .on("mouseleave", function () {
        if (hoveredPoint?.element === this) hoveredPoint = null;
        hideLater();
      })
      .on("focus", function (_, d) {
        focusedPoint = { element: this, data: d };
        show(this, d);
        d3.select(this).select("circle").attr("stroke-width", 4);
      })
      .on("blur", function () {
        if (focusedPoint?.element === this) focusedPoint = null;
        hideLater();
        d3.select(this).select("circle").attr("stroke-width", 2);
      });
    points
      .append("circle")
      .attr("aria-hidden", "true")
      .attr("cx", (d) => x(d.technicalDebtInfo?.businessMaturity ?? 0))
      .attr("cy", (d) => y(d.technicalDebtInfo?.technicalMaturity ?? 0))
      .attr("r", (d) => {
        const cost = costValue(d);
        return cost === null ? 8 : radius(cost);
      })
      .attr("fill", (d) => {
        const cost = costValue(d);
        return cost === null ? "var(--background-default-grey)" : color(cost);
      })
      .attr("stroke-dasharray", (d) => (costValue(d) === null ? "3 2" : null))
      .attr("stroke", "var(--text-default-grey)")
      .attr("stroke-width", 2)
      .attr("cursor", "pointer")
      .attr("data-testid", "technical-debt-point");

    return this;
  }

  /** Barre de dégradé couleur MCO en bas à droite (jaune → rouge, valeurs 1-5) */
  drawColorLegend(): this {
    const { color } = this.scales;
    const { plotWidth, plotHeight } = this.layout;

    const legendWidth = Math.min(180, plotWidth);
    const legendHeight = 8;
    const legend = this.g.append("g").attr("transform", `translate(${plotWidth - legendWidth},${plotHeight + 90})`);

    const gradientId = `${this.svg.attr("id") || "time-chart"}-cost-gradient`;
    const defs = this.svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", color(1));
    gradient.append("stop").attr("offset", "100%").attr("stop-color", color(5));

    legend
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("fill", `url(#${gradientId})`)
      .attr("rx", 2)
      .attr("ry", 2);

    const legendAxis = d3
      .axisBottom(d3.scaleLinear().domain([1, 5]).range([0, legendWidth]))
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
          .text("Maîtrise des coûts MCO"),
      );

    return this;
  }
}
