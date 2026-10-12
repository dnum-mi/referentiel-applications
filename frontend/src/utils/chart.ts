import type { Ref } from "vue";
import { Chart, registerables, type Plugin } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { cssVar } from "./cssVars";

// Register necessary Chart.js components and plugins
Chart.register(...registerables, ChartDataLabels);

type ChartType = "bar" | "line";

/**
 * Crée ou met à jour un graphique Chart.js.
 *
 * @param canvasRef      Référence au canvas HTML
 * @param existingChart  Instance Chart.js existante (sera détruite si fournie)
 * @param labels         Tableau des labels pour l'axe des abscisses
 * @param data           Valeurs numériques à afficher
 * @param type           Type de graphique ('bar' ou 'line')
 * @returns L'instance Chart.js créée
 */
export function renderChart(
  canvasRef: Ref<HTMLCanvasElement | null>,
  existingChart: Chart | null,
  labels: string[],
  data: number[],
  type: ChartType = "bar",
): Chart | null {
  const canvas = canvasRef.value;
  if (!canvas) return null;

  // Detruire l'ancien graphique si nécessaire
  if (existingChart) {
    existingChart.destroy();
  }

  let observer: MutationObserver | undefined;
  // Les callbacks empêchent Chart.js de réutiliser une couleur d'élément du thème précédent.
  const accent = () => cssVar("--background-action-high-blue-france") || "#000091";
  const themePlugin: Plugin = {
    id: "refapp-chart-theme",
    beforeUpdate(chart) {
      const text = cssVar("--text-default-grey") || "#161616";
      const background = cssVar("--background-default-grey") || "#fff";
      chart.options.color = text;
      for (const scale of Object.values(chart.options.scales ?? {})) {
        if (scale) {
          // Chart.js expose ici des options résolues par Proxy : conserver leurs descripteurs.
          if (scale.ticks) scale.ticks.color = text;
          if (scale.grid) scale.grid.color = cssVar("--border-default-grey") || "#ddd";
        }
      }
      if (chart.options.plugins?.datalabels) {
        chart.options.plugins.datalabels.color = text;
        chart.options.plugins.datalabels.backgroundColor = background;
      }
    },
    afterDestroy() {
      observer?.disconnect();
    },
  };
  try {
    const chart = new Chart(canvas, {
      type,
      plugins: [themePlugin],
      data: {
        labels,
        datasets: [
          {
            type,
            label: type === "line" ? "IQ moyen" : "Répartition",
            data,
            backgroundColor: accent,
            borderColor: accent,
            pointBackgroundColor: accent,
            pointBorderColor: accent,
            fill: type !== "line",
            tension: type === "line" ? 0.3 : 0,
            pointRadius: type === "line" ? 4 : 0,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          // Les mêmes valeurs sont visibles sur le graphique et disponibles dans le tableau.
          tooltip: { enabled: false },
          datalabels: {
            color: cssVar("--text-default-grey") || "#161616",
            backgroundColor: cssVar("--background-default-grey") || "#fff",
            borderRadius: 2,
            padding: 2,
            align: "top",
            anchor: "end",
            clamp: true,
            formatter: (value: number) => (type === "line" ? `${value} %` : value),
          },
        },
        scales: { x: { ticks: {} }, y: { beginAtZero: true, ticks: {}, ...(type === "line" ? { max: 100 } : {}) } },
        layout: { padding: { top: 24 } },
      },
    });
    observer = new MutationObserver(() => chart.update("none"));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-fr-theme", "data-fr-scheme", "class", "style"],
    });
    return chart;
  } catch (error) {
    Chart.getChart(canvas)?.destroy();
    throw error;
  }
}
