import type { Ref } from "vue";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

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

  // Créer et retourner la nouvelle instance Chart.js
  return new Chart(canvas, {
    type,
    data: {
      labels,
      datasets: [
        {
          type,
          label: type === "line" ? "IQ moyen" : "Répartition",
          data,
          backgroundColor: "#3e95cd",
          borderColor: "#3e95cd",
          fill: type === "line" ? false : true,
          tension: type === "line" ? 0.3 : 0,
          pointRadius: type === "line" ? 4 : 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        datalabels: {
          color: type === "line" ? "black" : "white",
          align: type === "line" ? "top" : "center",
          anchor: type === "line" ? "end" : "center",
        },
      },
      scales: {},
    },
  });
}
