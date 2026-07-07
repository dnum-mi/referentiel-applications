import * as d3 from "d3";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { TechnicalDebtPoint } from "@/composables/use-application-search";
import { TimeChartBuilder, type ChartScales } from "@/chart/time-chart.builder";

export function useTechnicalDebtChart(props: { data: TechnicalDebtPoint[]; height?: number }) {
  const containerRef = ref<HTMLDivElement | null>(null);
  const svgRef = ref<SVGSVGElement | null>(null);
  const resizeObserver = ref<ResizeObserver>();

  const chartHeight = computed(() => props.height ?? 700);

  function destroyChart() {
    if (svgRef.value) {
      d3.select(svgRef.value).selectAll("*").remove();
    }
  }

  function drawChart() {
    const root = containerRef.value;
    const svgEl = svgRef.value;
    if (!root || !svgEl) return;

    const width = root.clientWidth;
    const height = chartHeight.value;
    const margin = { top: 60, right: 60, bottom: 80, left: 80 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    destroyChart();

    const svg = d3
      .select(svgEl)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("role", "img")
      .attr("aria-label", "Distribution des applications selon les maturites TIME");

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const scales: ChartScales = {
      x: d3.scaleLinear().domain([1, 5]).range([0, plotWidth]),
      y: d3.scaleLinear().domain([1, 5]).range([plotHeight, 0]),
      color: d3.scaleSequential(d3.interpolateYlOrRd).domain([1, 5]),
      radius: d3.scaleLinear().domain([1, 5]).range([4, 12]),
    };

    new TimeChartBuilder(g, svg, root, scales, { plotWidth, plotHeight, margin }, props.data)
      .drawTitle()
      .drawAxes()
      .drawQuadrants()
      .drawAxisLegends()
      .drawBubbles()
      .drawColorLegend();
  }

  function handleResize() {
    destroyChart();
    nextTick(drawChart);
  }

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
