import { cleanup, fireEvent, render, screen, within } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import type { RelationGraphDto } from "@/client";
import RelationShipGraph from "./RelationShipGraph.vue";

const { fetchGraph } = vi.hoisted(() => ({ fetchGraph: vi.fn() }));
vi.mock("@/api/index", () => ({ default: { relationControllerGetRelationGraph: fetchGraph } }));

const deepGraph: RelationGraphDto = {
  rootId: "root",
  nodes: [
    { id: "root", label: "Application racine", status: "in_production" },
    { id: "a", label: "Alpha" },
    { id: "b", label: "Beta" },
    { id: "c", label: "Gamma" },
    { id: "d", label: "Schmeler" },
  ],
  edges: [
    { id: "1", sourceId: "root", sourceLabel: "Application racine", targetId: "a", targetLabel: "Alpha", type: "is_part_of" },
    { id: "2", sourceId: "root", sourceLabel: "Application racine", targetId: "b", targetLabel: "Beta", type: "is_service_user_of" },
    { id: "3", sourceId: "a", sourceLabel: "Alpha", targetId: "c", targetLabel: "Gamma", type: "is_part_of" },
    { id: "4", sourceId: "b", sourceLabel: "Beta", targetId: "d", targetLabel: "Schmeler", type: "is_correlated_with" },
  ],
};
const shallowGraph: RelationGraphDto = { ...deepGraph, nodes: deepGraph.nodes.slice(0, 3), edges: deepGraph.edges.slice(0, 2) };

async function renderGraph() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ name: "application", path: "/applications/:id", component: { template: "<p>Fiche</p>" } }],
  });
  await router.push("/applications/root");
  const rendered = render(RelationShipGraph, {
    props: { applicationId: "root", viewMode: "graph" },
    global: {
      plugins: [router],
      stubs: { DsfrButton: { props: ["disabled"], template: '<button :disabled="disabled"><slot /></button>' } },
    },
  });
  await flushPromises();
  return { ...rendered, router };
}

describe("Relations — navigation et alternative du réseau", () => {
  beforeEach(() => {
    fetchGraph
      .mockReset()
      .mockImplementation(({ query }: { query: { depth: number } }) =>
        Promise.resolve({ response: { ok: true }, data: query.depth === 1 ? shallowGraph : deepGraph }),
      );
  });
  afterEach(cleanup);

  it("conserve les cinq applications et quatre relations quand on passe du graphe profondeur 2 à la liste", async () => {
    const { rerender, container } = await renderGraph();
    await fireEvent.update(screen.getByRole("spinbutton", { name: "Saisir la profondeur du réseau" }), "2");
    await fireEvent.change(screen.getByRole("spinbutton"));
    await flushPromises();
    expect(fetchGraph).toHaveBeenLastCalledWith({ path: { applicationId: "root" }, query: { depth: 2 } });
    expect(container.querySelectorAll("svg a[data-node-id]")).toHaveLength(5);
    await rerender({ applicationId: "root", viewMode: "list" });
    const transcription = screen.getByTestId("relations-graph-transcription");
    expect(within(transcription).getByRole("heading", { name: "Applications du réseau (5)" })).toBeInTheDocument();
    expect(within(transcription).getAllByRole("link", { name: "Schmeler" })).toHaveLength(2);
    expect(transcription.querySelectorAll("tbody tr")).toHaveLength(4);
    expect(within(transcription).getByRole("table")).toHaveAccessibleName("Relations du réseau — profondeur 2 (4 relations)");
    expect(fetchGraph).toHaveBeenCalledTimes(2);
  });

  it("applique les mêmes filtres au graphe et à la transcription, en gardant la racine si aucun type n'est sélectionné", async () => {
    const { container } = await renderGraph();
    for (const checkbox of screen.getAllByRole("checkbox")) await fireEvent.click(checkbox);
    await flushPromises();
    expect(container.querySelectorAll("svg a[data-node-id]")).toHaveLength(1);
    expect(screen.getByTestId("relations-graph-transcription").querySelectorAll("li")).toHaveLength(1);
    expect(screen.getByTestId("relations-graph-transcription")).toHaveTextContent("Aucune relation à afficher");
  });

  it("garde le focus sur le filtre actionné pendant le redessin du SVG", async () => {
    await renderGraph();
    const checkbox = screen.getAllByRole("checkbox")[0]!;
    checkbox.focus();
    await fireEvent.click(checkbox);
    await flushPromises();
    expect(document.activeElement).toBe(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("restaure le focus sur le même nœud encore visible, ou sur la zone du graphe s'il est filtré", async () => {
    const { container } = await renderGraph();
    const root = container.querySelector<SVGAElement>('svg a[data-node-id="root"]')!;
    root.focus();
    const checkboxes = screen.getAllByRole("checkbox");
    await fireEvent.click(checkboxes[0]);
    await flushPromises();
    expect(document.activeElement).toBe(container.querySelector('svg a[data-node-id="root"]'));
    const beta = container.querySelector<SVGAElement>('svg a[data-node-id="b"]')!;
    beta.focus();
    await fireEvent.click(checkboxes[2]);
    await flushPromises();
    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Graphe des relations, zone défilante" }));
  });

  it("propose des liens de nœuds, une navigation normale et toutes les commandes sans glisser-déposer", async () => {
    const { container, router } = await renderGraph();
    const link = container.querySelector<SVGAElement>('svg a[data-node-id="a"]')!;
    expect(link).toHaveAttribute("href", "/applications/a");
    expect(link).toHaveAttribute("tabindex", "0");
    const oldTransform = link.getAttribute("transform");
    await fireEvent.keyDown(link, { key: "ArrowRight", shiftKey: true });
    expect(link.getAttribute("transform")).not.toBe(oldTransform);
    const image = screen.getByRole("img", { name: "Relations de Application racine, profondeur 1" });
    expect(image.getAttribute("aria-details")).toBe(screen.getByTestId("relations-graph-transcription").id);
    const viewport = image.querySelector("g")!;
    await fireEvent.click(screen.getByRole("button", { name: "Zoomer" }));
    expect(viewport.getAttribute("transform")).toContain("scale(1.25)");
    const zoomTransform = viewport.getAttribute("transform");
    await fireEvent.click(screen.getByRole("button", { name: "Déplacer la vue à gauche" }));
    expect(viewport.getAttribute("transform")).not.toBe(zoomTransform);
    await fireEvent.click(screen.getByRole("button", { name: "Réinitialiser le zoom" }));
    expect(viewport.getAttribute("transform")).toBe("translate(0,0) scale(1)");
    await fireEvent.click(link);
    await flushPromises();
    expect(router.currentRoute.value.params.id).toBe("a");
  });

  it("déplace chaque nœud depuis des commandes HTML et conserve ou réinitialise la sélection selon les filtres", async () => {
    const { container } = await renderGraph();
    const selection = screen.getByRole("combobox", { name: "Nœud à déplacer dans le graphe" });
    await fireEvent.update(selection, "b");
    const node = container.querySelector('svg a[data-node-id="b"]')!;
    const original = node.getAttribute("transform");
    const command = screen.getByRole("button", { name: "Déplacer le nœud à droite" });
    command.focus();
    await fireEvent.click(command);
    expect(node.getAttribute("transform")).not.toBe(original);
    expect(document.activeElement).toBe(command);
    await fireEvent.click(screen.getAllByRole("checkbox")[0]);
    await flushPromises();
    expect(selection).toHaveValue("b");
    await fireEvent.click(screen.getAllByRole("checkbox")[2]);
    await flushPromises();
    expect(selection).toHaveValue("root");
    expect(within(selection).queryByRole("option", { name: "Beta" })).not.toBeInTheDocument();
  });

  it("ne réaffiche pas une ancienne profondeur reçue après la nouvelle", async () => {
    let finish!: (value: { response: { ok: true }; data: RelationGraphDto }) => void;
    fetchGraph.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    await renderGraph();
    await fireEvent.update(screen.getByRole("spinbutton"), "2");
    await fireEvent.change(screen.getByRole("spinbutton"));
    await flushPromises();
    finish({ response: { ok: true }, data: shallowGraph });
    await flushPromises();
    expect(screen.getByTestId("relations-graph-status")).toHaveTextContent("5 applications et 4 relations affichées, profondeur 2");
  });

  it("annonce les erreurs de chargement et ne présente pas des données précédentes comme actuelles", async () => {
    fetchGraph.mockRejectedValueOnce(new Error("Réseau indisponible"));
    await renderGraph();
    expect(screen.getByRole("alert")).toHaveTextContent("Impossible de charger le réseau");
    expect(screen.queryByTestId("relations-graph-transcription")).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole("button", { name: "Réessayer le chargement du réseau" }));
    await flushPromises();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByTestId("relations-graph-status")).toHaveTextContent("3 applications et 2 relations");
  });
});
