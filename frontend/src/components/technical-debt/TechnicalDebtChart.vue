<script setup lang="ts">
import * as d3 from "d3";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { TechnicalDebtPoint } from "@/composables/use-application-search";

const props = defineProps<{
  data: TechnicalDebtPoint[];
  height?: number;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const resizeObserver = ref<ResizeObserver>();

const chartHeight = computed(() => props.height ?? 460);

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
  const margin = { top: 32, right: 32, bottom: 48, left: 56 };

  destroyChart();

  const svg = d3
    .select(svgEl)
    .attr("width", width)
    .attr("height", height)
    .attr("role", "img")
    .attr("aria-label", "Distribution des applications selon les maturites TIME");

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, 5]).range([0, plotWidth]);
  const y = d3.scaleLinear().domain([0, 5]).range([plotHeight, 0]);
  const color = d3.scaleSequential(d3.interpolateBlues).domain([0, 5]);

  const xAxis = d3
    .axisBottom(x)
    .ticks(5)
    .tickFormat((d) => `${d}`);
  const yAxis = d3
    .axisLeft(y)
    .ticks(5)
    .tickFormat((d) => `${d}`);

  g.append("g")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(xAxis)
    .call((axis) =>
      axis
        .append("text")
        .attr("x", plotWidth)
        .attr("y", 36)
        .attr("fill", "currentColor")
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .text("Maturite technique"),
    );

  g.append("g")
    .call(yAxis)
    .call((axis) =>
      axis
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -margin.top)
        .attr("y", -40)
        .attr("fill", "currentColor")
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .text("Maturite metier"),
    );

  const tooltip = d3
    .select(root)
    .append("div")
    .attr("class", "td-tooltip fr-p-1w fr-text--sm")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background", "var(--background-raised-grey, #f6f6f6)")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("box-shadow", "0 4px 12px rgba(0,0,0,0.08)")
    .style("display", "none");

  const points = g
    .selectAll("circle")
    .data(props.data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.technicalDebtInfo.technicalMaturity))
    .attr("cy", (d) => y(d.technicalDebtInfo.businessMaturity))
    .attr("r", 8)
    .attr("fill", (d) => color(d.technicalDebtInfo.costMaturity))
    .attr("opacity", 0.9)
    .attr("stroke", "#0d6efd")
    .attr("stroke-width", 0.6)
    .attr("data-testid", "technical-debt-point")
    .on("mouseenter", (_, d) => {
      tooltip
        .style("display", "block")
        .html(
          `<strong>${d.shortName ?? d.label}</strong><br/>` +
            `Technique: ${d.technicalDebtInfo.technicalMaturity}<br/>` +
            `Metier: ${d.technicalDebtInfo.businessMaturity}<br/>` +
            `Coût MCO: ${d.technicalDebtInfo.costMaturity}`,
        );
    })
    .on("mousemove", (event) => {
      tooltip.style("left", `${event.offsetX + 12}px`).style("top", `${event.offsetY + 12}px`);
    })
    .on("mouseleave", () => {
      tooltip.style("display", "none");
    });

  points
    .append("title")
    .text(
      (d) =>
        `${d.shortName ?? d.label} - T:${d.technicalDebtInfo.technicalMaturity} / M:${d.technicalDebtInfo.businessMaturity} / C:${d.technicalDebtInfo.costMaturity}`,
    );

  const legendWidth = 180;
  const legendHeight = 8;
  const legend = g.append("g").attr("transform", `translate(${plotWidth - legendWidth},${-8})`);

  const gradientId = "cost-gradient";
  const defs = svg.append("defs");
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

  const legendScale = d3.scaleLinear().domain([0, 5]).range([0, legendWidth]);
  const legendAxis = d3
    .axisBottom(legendScale)
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
        .attr("y", legendHeight + 16)
        .attr("text-anchor", "end")
        .attr("fill", "currentColor")
        .attr("font-size", "12px")
        .text("Cout du MCO"),
    );
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
</script>

<template>
  <div ref="containerRef" class="technical-debt-scatter">
    <svg v-if="props.data.length" ref="svgRef" role="img" aria-label="Graphique de maturite TIME"></svg>
    <p v-else class="fr-text--sm fr-text--italic fr-mt-2w" data-testid="technical-debt-empty">
      Aucune donnee TIME disponible pour vos applications autorisees.
    </p>
  </div>
</template>

<style scoped>
.technical-debt-scatter {
  position: relative;
  width: 100%;
}

.td-tooltip {
  z-index: 1;
}
</style>
