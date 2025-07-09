import type { Ref } from "vue";
import { Chart, BarController, BarElement, CategoryScale, LinearScale } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, ChartDataLabels);

export function renderChart(
  chartRef: Ref<HTMLCanvasElement | null>,
  chartInstance: Chart | null,
  labels: string[],
  data: number[],
): Chart | null {
  if (!chartRef.value) return null;

  if (chartInstance) {
    chartInstance.destroy();
  }

  return new Chart(chartRef.value, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: "#3e95cd",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        datalabels: {
          color: "white",
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
