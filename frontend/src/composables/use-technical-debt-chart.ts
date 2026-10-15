import * as d3 from "d3";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { TechnicalDebtPoint } from "@/composables/use-application-search";
import { TimeChartBuilder, type ChartScales } from "@/chart/time-chart.builder";

export function useTechnicalDebtChart(props: { data: TechnicalDebtPoint[]; height?: number }) {
  const containerRef = ref<HTMLDivElement | null>(null);
  const svgRef = ref<SVGSVGElement | null>(null);
  const resizeObserver = ref<ResizeObserver>();

  const chartHeight = computed(() => props.height ?? 700);
  let builder: TimeChartBuilder | null = null;

  function destroyChart() {
    builder?.destroy();
    builder = null;
    if (svgRef.value) {
      d3.select(svgRef.value).selectAll("*").remove();
    }
  }

  function drawChart() {
    const root = containerRef.value;
    const svgEl = svgRef.value;
    const activeElement = document.activeElement;
    const focusedPointId =
      svgEl && activeElement instanceof SVGElement && svgEl.contains(activeElement) ? activeElement.dataset.applicationId : null;
    destroyChart();
    if (!root || !svgEl) return;

    const width = Math.max(root.clientWidth, 640);
    const height = Math.max(chartHeight.value, 600);
    const margin = { top: 60, right: 60, bottom: 150, left: 80 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl).attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Marge entre les bornes du domaine (valeurs 1 et 5) et le bord du cadran,
    // pour que les bulles au rayon max (cf. échelle radius) ne soient pas collées au bord.
    const bubbleEdgePadding = 16;

    const scales: ChartScales = {
      x: d3
        .scaleLinear()
        .domain([1, 5])
        .range([bubbleEdgePadding, plotWidth - bubbleEdgePadding]),
      y: d3
        .scaleLinear()
        .domain([1, 5])
        .range([plotHeight - bubbleEdgePadding, bubbleEdgePadding]),
      color: d3.scaleSequential(d3.interpolateYlOrRd).domain([1, 5]),
      radius: d3.scaleLinear().domain([1, 5]).range([4, 12]),
    };

    const plottedData = props.data.filter(
      (point) =>
        typeof point.technicalDebtInfo?.technicalMaturity === "number" &&
        Number.isFinite(point.technicalDebtInfo.technicalMaturity) &&
        typeof point.technicalDebtInfo?.businessMaturity === "number" &&
        Number.isFinite(point.technicalDebtInfo.businessMaturity),
    );
    builder = new TimeChartBuilder(g, svg, root, scales, { plotWidth, plotHeight, margin }, plottedData);
    builder.drawTitle().drawAxes().drawQuadrants().drawAxisLegends().drawBubbles().drawColorLegend();
    if (focusedPointId) {
      const replacement = Array.from(svgEl.querySelectorAll<SVGAElement>("a[data-application-id]")).find(
        (point) => point.dataset.applicationId === focusedPointId,
      );
      if (replacement) replacement.focus();
      else svgEl.parentElement?.focus();
    }
  }

  const handleResize = () => nextTick(drawChart);

  onMounted(() => {
    nextTick(drawChart);
    resizeObserver.value = new ResizeObserver(handleResize);
    if (containerRef.value) {
      resizeObserver.value.observe(containerRef.value);
    }
  });

  onBeforeUnmount(() => {
    resizeObserver.value?.disconnect();
    destroyChart();
  });

  watch(
    () => props.data,
    () => {
      nextTick(drawChart);
    },
    { deep: true },
  );

  return { containerRef, svgRef };
}
