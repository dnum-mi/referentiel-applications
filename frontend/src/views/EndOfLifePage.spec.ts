import Aura from "@primevue/themes/aura";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import PrimeVue from "primevue/config";
import { ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import type { EndOfLifeApplicationDto } from "@/client/types.gen";
import { routeNames } from "@/router/route-names";
import EndOfLifePage from "./EndOfLifePage.vue";

/**
 * Deux contraintes se combinent ici :
 * - `storeToRefs` ne retient QUE les propriétés déjà réactives : un mock exposant
 *   des valeurs nues laisserait `isLoading` et consorts à `undefined` ;
 * - `vi.hoisted` s'exécute AVANT les imports, donc `ref` n'y est pas encore
 *   disponible.
 * D'où des refs déclarées au niveau du module : la fabrique du mock n'est
 * invoquée qu'au `setup()` du composant, c'est-à-dire au `render`, quand elles
 * sont initialisées.
 */
const storeMock = {
  applications: ref<EndOfLifeApplicationDto[]>([]),
  total: ref(0),
  isLoading: ref(false),
  fetchApplications: vi.fn(),
};

vi.mock("@/stores/endOfLifeStore", () => ({
  useEndOfLifeStore: () => storeMock,
}));

const StubPage = { template: "<div/>" };

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { name: routeNames.PROFILEAPP, path: "/applications/:id/:tab?", component: StubPage },
      { name: routeNames.ENDOFLIFE, path: "/fins-de-vie", component: StubPage },
    ],
  });
}

const day = 24 * 60 * 60 * 1000;

function applicationFixture(overrides: Partial<EndOfLifeApplicationDto> = {}): EndOfLifeApplicationDto {
  return {
    id: "app-1",
    label: "Portail Agent",
    shortName: "PA",
    organizationPaths: ["MI/DNUM"],
    worstStatus: "eol",
    technologies: [
      {
        id: "tech-1",
        technology: "Base de données",
        product: "PostgreSQL",
        version: "13",
        eolDate: new Date(Date.now() - 10 * day) as unknown as Date,
        eoasDate: null,
        latestVersion: "15.5",
        eolSource: "endoflife",
        status: "eol",
      },
    ],
    ...overrides,
  };
}

// `RefAppTable` s'appuie sur la DataTable de PrimeVue : sans le plugin, les
// lignes ne sont pas rendues et les slots de cellule restent vides.
const render_ = () =>
  render(EndOfLifePage, {
    global: { plugins: [makeRouter(), [PrimeVue, { theme: { preset: Aura } }]] },
  });

describe("EndOfLifePage", () => {
  beforeEach(() => {
    storeMock.applications.value = [];
    storeMock.total.value = 0;
    storeMock.isLoading.value = false;
    storeMock.fetchApplications.mockReset().mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it("charge la liste au montage, page 0 et triée par libellé", async () => {
    render_();
    await waitFor(() => expect(storeMock.fetchApplications).toHaveBeenCalledTimes(1));
    expect(storeMock.fetchApplications).toHaveBeenCalledWith({
      page: 0,
      pageSize: 15,
      sortBy: "label",
      order: "asc",
    });
  });

  // #2413 : le titre de la page reprend l'entrée de menu « Technologies ».
  it("s'intitule « Technologies », comme l'entrée de menu", () => {
    render_();
    expect(screen.getByTestId("end-of-life-page-title")).toHaveTextContent("Technologies");
  });

  it("affiche l'application, ses organisations et sa technologie concernée", async () => {
    storeMock.applications.value = [applicationFixture()];
    storeMock.total.value = 1;

    render_();

    // On interroge le contenu de la table plutôt que des nœuds isolés : PrimeVue
    // répartit le rendu des slots de cellule, et cibler un texte exact rendrait
    // le test sensible à ce découpage.
    const table = await screen.findByTestId("end-of-life-table");
    expect(table).toHaveTextContent("Portail Agent");
    expect(table).toHaveTextContent("MI/DNUM");
    expect(table).toHaveTextContent("PostgreSQL 13");
    expect(screen.getByTestId("end-of-life-badge-tech-1")).toHaveTextContent("Fin de vie");
  });

  // #2454 : une date saisie à la main est classée comme une date calculée ; la vue signale
  // seulement son origine, complément sr-only compris (le title n'est pas restitué au clavier).
  it("signale « saisie manuelle » à côté d'une date renseignée à la main", async () => {
    storeMock.applications.value = [
      applicationFixture({
        worstStatus: "eol-soon",
        technologies: [
          {
            id: "tech-manual",
            technology: "Logiciel interne",
            product: "Outil maison",
            version: "2",
            eolDate: new Date(Date.now() + 30 * day) as unknown as Date,
            eoasDate: null,
            latestVersion: null,
            eolSource: "manual",
            status: "eol-soon",
          },
        ],
      }),
    ];
    storeMock.total.value = 1;

    render_();

    expect(await screen.findByTestId("end-of-life-badge-tech-manual")).toHaveTextContent("Fin de vie proche");
    const mention = screen.getByTestId("end-of-life-manual-tech-manual");
    expect(mention).toHaveTextContent("saisie manuelle");
    expect(mention).toHaveTextContent("renseignée à la main");
    expect(screen.queryByTestId("end-of-life-manual-tech-1")).not.toBeInTheDocument();
  });

  it("renvoie vers l'onglet Technologies de la fiche", async () => {
    storeMock.applications.value = [applicationFixture()];
    storeMock.total.value = 1;

    render_();

    const link = await screen.findByTestId("end-of-life-row-app-1-link");
    expect(link).toHaveAttribute("href", "/applications/app-1/tab-technologies");
  });

  /**
   * Un filtre vide doit être OMIS, pas envoyé en chaîne vide : côté serveur
   * `status: ""` échouerait la validation d'énumération.
   */
  it("n'envoie que les filtres renseignés", async () => {
    render_();
    await waitFor(() => expect(storeMock.fetchApplications).toHaveBeenCalledTimes(1));

    await fireEvent.update(screen.getByTestId("end-of-life-filter-status"), "eol");

    await waitFor(() => expect(storeMock.fetchApplications).toHaveBeenCalledTimes(2));
    const query = storeMock.fetchApplications.mock.calls[1][0];
    expect(query.status).toBe("eol");
    expect(query).not.toHaveProperty("organization");
    expect(query).not.toHaveProperty("search");
  });

  // Rester page 3 d'un résultat qui n'en compte plus qu'une afficherait une
  // liste vide sans explication.
  it("revient en page 0 au changement de filtre", async () => {
    storeMock.applications.value = [applicationFixture()];
    storeMock.total.value = 100;

    render_();
    await waitFor(() => expect(storeMock.fetchApplications).toHaveBeenCalledTimes(1));

    await fireEvent.update(screen.getByTestId("end-of-life-filter-status"), "eol-soon");

    await waitFor(() => expect(storeMock.fetchApplications).toHaveBeenCalledTimes(2));
    expect(storeMock.fetchApplications.mock.calls[1][0].page).toBe(0);
  });

  it("annonce le nombre de résultats aux technologies d'assistance", async () => {
    storeMock.applications.value = [applicationFixture()];
    storeMock.total.value = 42;

    render_();

    expect(await screen.findByTestId("end-of-life-status")).toHaveTextContent("Résultat 1 à 1 sur 42");
  });

  it("annonce explicitement l'absence de résultat", async () => {
    render_();

    expect(await screen.findByTestId("end-of-life-status")).toHaveTextContent("Aucune application concernée");
    expect(screen.getByTestId("end-of-life-empty")).toBeInTheDocument();
  });

  it("efface tous les filtres d'un coup", async () => {
    render_();
    await waitFor(() => expect(storeMock.fetchApplications).toHaveBeenCalledTimes(1));

    await fireEvent.update(screen.getByTestId("end-of-life-filter-status"), "eol");
    await waitFor(() => expect(storeMock.fetchApplications).toHaveBeenCalledTimes(2));

    await fireEvent.click(screen.getByTestId("end-of-life-clear-filters"));

    await waitFor(() => expect(storeMock.fetchApplications).toHaveBeenCalledTimes(3));
    const query = storeMock.fetchApplications.mock.calls[2][0];
    expect(query).not.toHaveProperty("status");
  });

  it("affiche la date de fin de support actif pour une technologie sortie du support", async () => {
    storeMock.applications.value = [
      applicationFixture({
        worstStatus: "eoas-passed",
        technologies: [
          {
            id: "tech-2",
            technology: "Runtime",
            product: "Node.js",
            version: "20",
            eolDate: new Date(Date.now() + 400 * day) as unknown as Date,
            eoasDate: new Date(Date.now() - day) as unknown as Date,
            latestVersion: "20.19.5",
            eolSource: "endoflife",
            status: "eoas-passed",
          },
        ],
      }),
    ];
    storeMock.total.value = 1;

    render_();

    const table = await screen.findByTestId("end-of-life-table");
    expect(table).toHaveTextContent("support actif clos le");
    expect(screen.getByTestId("end-of-life-badge-tech-2")).toHaveTextContent("Fin de support actif");
  });
});

describe("EndOfLifePage — pastille de synthèse et tri (#2528, #2522)", () => {
  beforeEach(() => {
    storeMock.applications.value = [];
    storeMock.total.value = 0;
    storeMock.isLoading.value = false;
    storeMock.fetchApplications.mockReset().mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it("affiche le statut le plus grave de l'application à côté de son libellé", async () => {
    storeMock.applications.value = [applicationFixture({ worstStatus: "eol-soon" })];
    storeMock.total.value = 1;
    render_();
    expect(await screen.findByTestId("end-of-life-worst-app-1")).toHaveTextContent("Fin de vie proche");
  });

  it("le premier clic sur « Application » inverse le tri initial par libellé", async () => {
    storeMock.applications.value = [applicationFixture()];
    storeMock.total.value = 1;
    render_();
    await screen.findByTestId("end-of-life-table");
    // L'en-tête reflète le tri initial (par libellé, croissant) avant tout clic.
    const sortButton = screen.getByRole("button", { name: "Application" });
    expect(sortButton).toHaveAttribute("title", "Application - Tri ascendant");
    await fireEvent.click(sortButton);
    await waitFor(() =>
      expect(storeMock.fetchApplications).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: "label", order: "desc" })),
    );
  });
});
