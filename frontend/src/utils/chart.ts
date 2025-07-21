import type { Ref } from "vue";
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";


Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ChartDataLabels
);


type ChartType = "bar" | "line";

export function renderChart(
  chartRef: Ref<HTMLCanvasElement | null>,
  chartInstance: Chart | null,
  labels: string[],
  data: number[],
  chartType: ChartType = "bar" // valeur par défaut : bar
): Chart | null {
  if (!chartRef.value) return null;

  // Détruit l'ancien graphique s'il existe
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Crée un nouveau graphique
  return new Chart(chartRef.value, {
    type: chartType,
    data: {
      labels,
      datasets: [
        {
          type: chartType,
          label: chartType === "line" ? "IQ moyen" : "Répartition",
          data,
          backgroundColor: "#3e95cd",
          borderColor: "#3e95cd",
          fill: chartType === "line" ? false : true,
          tension: chartType === "line" ? 0.3 : undefined,
          pointRadius: chartType === "line" ? 4 : 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        datalabels: {
          color: chartType === "line" ? "black" : "white",
          align: chartType === "line" ? "top" : "center",
          anchor: chartType === "line" ? "end" : "center",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}