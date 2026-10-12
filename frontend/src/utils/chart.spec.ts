import { BarElement, Chart, LineElement, PointElement, type CategoryScale, type Element, type LinearScale, type Scale } from "chart.js";
import { ref } from "vue";
import { renderChart } from "./chart";

const canvases: HTMLCanvasElement[] = [];

function isCartesianScale(scale: Scale): scale is CategoryScale | LinearScale {
  return scale.type === "category" || scale.type === "linear";
}

function getCartesianScale(chart: Chart | null, axis: "x" | "y") {
  const scale = chart?.scales[axis];
  if (!scale || !isCartesianScale(scale)) {
    throw new Error(`Axe cartésien ${axis} attendu`);
  }
  return scale;
}

function isThemeElement(element: Element): element is BarElement | LineElement | PointElement {
  return element instanceof BarElement || element instanceof LineElement || element instanceof PointElement;
}

function getRenderedColors(chart: Chart) {
  const meta = chart.getDatasetMeta(0);
  const elements = [...meta.data, ...(meta.dataset ? [meta.dataset] : [])];
  return elements.map((element) => {
    if (!isThemeElement(element)) throw new Error("Barre, ligne ou point attendu");
    return { background: element.options.backgroundColor, border: element.options.borderColor };
  });
}

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 400;
  // La géométrie est simulée ; le constructeur, les options et les plugins Chart.js sont réels.
  const context = new Proxy(
    {
      canvas,
      measureText: (text: string) => ({
        width: String(text).length * 7,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 10,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 2,
      }),
      getLineDash: () => [],
    },
    { get: (target, key) => (Reflect.has(target, key) ? Reflect.get(target, key) : () => {}) },
  ) as unknown as CanvasRenderingContext2D;
  vi.spyOn(canvas, "getContext").mockReturnValue(context);
  canvases.push(canvas);
  return canvas;
}

beforeEach(() => {
  // Sélectionne BasicPlatform plutôt que les observateurs de taille du navigateur dans jsdom.
  vi.stubGlobal("window", undefined);
  document.documentElement.style.setProperty("--text-default-grey", "#161616");
  document.documentElement.style.setProperty("--background-default-grey", "#ffffff");
  document.documentElement.style.setProperty("--background-action-high-blue-france", "#000091");
});

afterEach(() => {
  for (const canvas of canvases) Chart.getChart(canvas)?.destroy();
  canvases.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const variable of ["--text-default-grey", "--background-default-grey", "--background-action-high-blue-france"]) {
    document.documentElement.style.removeProperty(variable);
  }
});

describe("Graphiques avec Chart.js réel", () => {
  it.each(["bar", "line"] as const)("crée et met à jour un graphique %s sans corrompre les options d'axes", (type) => {
    const chart = renderChart(ref(createCanvas()), null, ["Avril", "Mai"], [25, 45], type);
    expect(chart).toBeInstanceOf(Chart);
    expect(() => chart?.update("none")).not.toThrow();
    expect(chart?.data.datasets[0].data).toEqual([25, 45]);
    expect(getCartesianScale(chart, "x").options.ticks.color).toBe("#161616");
    expect(getCartesianScale(chart, "y").options.ticks.color).toBe("#161616");
    expect(getCartesianScale(chart, "y").max).toBe(type === "line" ? 100 : 45);
  });

  it.each(["bar", "line"] as const)(
    "actualise les éléments %s au changement de thème et arrête l'observation au démontage",
    async (type) => {
      const disconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
      const chart = renderChart(ref(createCanvas()), null, ["Avril", "Mai"], [25, 45], type);
      expect(chart).not.toBeNull();
      if (!chart) throw new Error("Graphique attendu");
      expect(getRenderedColors(chart)).toEqual(
        Array.from({ length: type === "line" ? 3 : 2 }, () => ({ background: "#000091", border: "#000091" })),
      );
      const update = vi.spyOn(chart, "update");
      document.documentElement.style.setProperty("--text-default-grey", "#f6f6f6");
      document.documentElement.style.setProperty("--background-action-high-blue-france", "#8585f6");
      await vi.waitFor(() => {
        expect(update).toHaveBeenCalledWith("none");
        expect(getCartesianScale(chart, "x").options.ticks.color).toBe("#f6f6f6");
        expect(getRenderedColors(chart)).toEqual(
          Array.from({ length: type === "line" ? 3 : 2 }, () => ({ background: "#8585f6", border: "#8585f6" })),
        );
      });
      document.documentElement.style.setProperty("--text-default-grey", "#161616");
      document.documentElement.style.setProperty("--background-action-high-blue-france", "#000091");
      await vi.waitFor(() => {
        expect(getCartesianScale(chart, "x").options.ticks.color).toBe("#161616");
        expect(getRenderedColors(chart)).toEqual(
          Array.from({ length: type === "line" ? 3 : 2 }, () => ({ background: "#000091", border: "#000091" })),
        );
      });
      chart.destroy();
      expect(disconnect).toHaveBeenCalledOnce();
    },
  );

  it("libère le canvas si le constructeur échoue afin de permettre un nouveau rendu", () => {
    const canvas = createCanvas();
    const failingPlugin = {
      id: "test-render-failure",
      beforeUpdate() {
        throw new Error("Échec de rendu");
      },
    };
    Chart.register(failingPlugin);
    try {
      expect(() => renderChart(ref(canvas), null, ["Mai"], [45])).toThrow("Échec de rendu");
      expect(Chart.getChart(canvas)).toBeUndefined();
    } finally {
      Chart.unregister(failingPlugin);
    }
    expect(renderChart(ref(canvas), null, ["Mai"], [45])).toBeInstanceOf(Chart);
  });
});
