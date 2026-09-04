import Aura from "@primevue/themes/aura";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import PrimeVue from "primevue/config";
import type { TechnologyDto } from "@/client/types.gen";
import type { ApplicationWithPerms } from "@/models/Application";
import TechnologyTab from "./TechnologyTab.vue";

afterEach(() => cleanup());

const findAllMock = vi.fn();
const listEolProductsMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

const { addErrorMessage, addSuccessMessage, hasPermissions } = vi.hoisted(() => ({
  addErrorMessage: vi.fn(),
  addSuccessMessage: vi.fn(),
  hasPermissions: vi.fn().mockReturnValue(false),
}));

vi.mock("@/api/index", () => ({
  default: {
    technologyControllerFindAll: (...args: unknown[]) => findAllMock(...args),
    technologyControllerListEolProducts: (...args: unknown[]) => listEolProductsMock(...args),
    technologyControllerCreate: (...args: unknown[]) => createMock(...args),
    technologyControllerUpdate: (...args: unknown[]) => updateMock(...args),
    technologyControllerDelete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage, addSuccessMessage }),
}));

vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({ hasPermissions }),
}));

beforeEach(() => {
  addErrorMessage.mockReset();
  addSuccessMessage.mockReset();
  hasPermissions.mockReset().mockReturnValue(false);
  createMock.mockReset();
  updateMock.mockReset();
  deleteMock.mockReset();
});

const applicationFixture = {
  id: "app-1",
  label: "Mon application",
  myPerms: new Set(),
} as unknown as ApplicationWithPerms;

// Ligne « neutre » : aucune échéance, jamais vérifiée. Chaque cas surcharge ce qu'il teste.
function makeTechnology(overrides: Partial<TechnologyDto> & Pick<TechnologyDto, "id">): TechnologyDto {
  return {
    applicationId: "app-1",
    technology: "Langage",
    product: "python",
    version: "3.8",
    docUrl: null,
    eolDate: null,
    eoasDate: null,
    eolCheckedAt: null,
    eolProduct: null,
    latestVersion: null,
    eolCycle: null,
    eolSource: "endoflife",
    ...overrides,
  };
}

const day = 24 * 60 * 60 * 1000;

// Ligne dont la fin de vie a été saisie à la main (#2454), telle que le backend la persiste :
// date + eolCheckedAt renseignés, tout ce qui vient d'endoflife.date à null.
function makeManualTechnology(overrides: Partial<TechnologyDto> & Pick<TechnologyDto, "id">): TechnologyDto {
  return makeTechnology({
    technology: "Logiciel interne",
    product: "Outil maison",
    version: "2",
    eolSource: "manual",
    eolProduct: null,
    eolCycle: null,
    latestVersion: null,
    eoasDate: null,
    eolCheckedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  });
}

// Ligne vérifiée et résolue sur endoflife.date, sans échéance. Le « — » de la colonne
// « Fin de vie » porte son propre data-testid : la colonne « Version » affiche le même
// tiret quand la version manque, une assertion sur toute la ligne ne prouverait rien.
function makeResolvedTechnology(overrides: Partial<TechnologyDto> & Pick<TechnologyDto, "id">): TechnologyDto {
  return makeTechnology({
    product: "MySQL",
    version: "8",
    docUrl: "https://dev.mysql.com/doc/",
    eolCheckedAt: new Date("2026-09-01T00:00:00Z"),
    eolProduct: "mysql",
    ...overrides,
  });
}

function renderWithTechnologies(technologies: TechnologyDto[]) {
  findAllMock.mockResolvedValue({ response: { ok: true }, data: technologies });
  listEolProductsMock.mockResolvedValue({ response: { ok: true }, data: [] });
  return render(TechnologyTab, {
    props: { application: applicationFixture },
    global: { plugins: [[PrimeVue, { theme: { preset: Aura } }]] },
  });
}

describe("technologyTab — colonne « Fin de vie »", () => {
  beforeEach(() => {
    findAllMock.mockReset();
    listEolProductsMock.mockReset();
  });

  // Quand endoflife.date est injoignable, le backend laisse eolCheckedAt à null : la cellule
  // doit le dire plutôt qu'afficher « — », indiscernable d'une technologie sans échéance publiée.
  it("signale « Non vérifiée » quand la fin de vie n'a jamais pu être vérifiée (eolCheckedAt null)", async () => {
    renderWithTechnologies([makeTechnology({ id: "t-unchecked", eolCheckedAt: null, eolProduct: null })]);

    const cell = await screen.findByTestId("technology-eol-unchecked-t-unchecked");

    expect(cell).toBeVisible();
    expect(cell).toHaveTextContent("Non vérifiée");
    // La cause n'est pas connue du front (service injoignable, ou vérification
    // désactivée par ENDOFLIFE_ENABLED=false) : le message reste neutre sur ce point.
    expect(cell).toHaveAttribute("title", expect.stringContaining("service injoignable ou vérification désactivée"));
    // Le complément est restitué hors title, pour le clavier et les lecteurs d'écran.
    expect(cell).toHaveTextContent("retentée automatiquement");
    expect(screen.queryByTestId("technology-eol-unknown-t-unchecked")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-badge-t-unchecked")).not.toBeInTheDocument();
  });

  it("signale « Produit non suivi » quand la vérification a eu lieu sans résoudre de produit (eolCheckedAt renseigné, eolProduct null)", async () => {
    renderWithTechnologies([makeTechnology({ id: "t-unknown", eolCheckedAt: new Date("2026-09-01T00:00:00Z"), eolProduct: null })]);

    const cell = await screen.findByTestId("technology-eol-unknown-t-unknown");

    expect(cell).toBeVisible();
    expect(cell).toHaveTextContent("Produit non suivi");
    expect(screen.queryByTestId("technology-eol-unchecked-t-unknown")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-badge-t-unknown")).not.toBeInTheDocument();
  });

  it("affiche le badge « Fin de vie » quand la date de fin de vie est dépassée", async () => {
    renderWithTechnologies([
      makeTechnology({
        id: "t-eol",
        eolCheckedAt: new Date("2026-09-01T00:00:00Z"),
        eolProduct: "python",
        eolDate: new Date("2020-01-01T00:00:00Z"),
      }),
    ]);

    const badge = await screen.findByTestId("technology-eol-badge-t-eol");

    expect(badge).toBeVisible();
    expect(badge).toHaveTextContent("Fin de vie");
    expect(screen.queryByTestId("technology-eol-unchecked-t-eol")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-unknown-t-eol")).not.toBeInTheDocument();
  });

  // #2449 : produit suivi, version saisie, mais aucun cycle apparié (« MySQL 8 » : 8.0 ou 8.4 ?).
  // Le backend n'écrit aucune date ; sans eolCycle la cellule affichait « — », comme un cycle
  // connu sans échéance publiée, et rien n'invitait à préciser la saisie.
  it("signale « Version non reconnue » quand le produit est suivi mais qu'aucun cycle n'est apparié", async () => {
    renderWithTechnologies([makeResolvedTechnology({ id: "t-unrecognized", eolCycle: null })]);

    const cell = await screen.findByTestId("technology-eol-unrecognized-t-unrecognized");

    expect(cell).toBeVisible();
    expect(cell).toHaveTextContent("Version non reconnue");
    expect(cell).toHaveAttribute("title", expect.stringContaining("précisez-la"));
    // Le complément est restitué hors title, pour le clavier et les lecteurs d'écran.
    expect(cell).toHaveTextContent("précisez-la");
    expect(screen.queryByTestId("technology-eol-unknown-t-unrecognized")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-unchecked-t-unrecognized")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-badge-t-unrecognized")).not.toBeInTheDocument();
  });

  it("affiche « — » quand le cycle est apparié mais ne publie aucune échéance", async () => {
    renderWithTechnologies([
      makeResolvedTechnology({
        id: "t-nodate",
        product: "Apache HTTP Server",
        version: "2.4",
        eolProduct: "apache-http-server",
        eolCycle: "2.4",
      }),
    ]);

    await screen.findByTestId("technology-table");

    expect(screen.queryByTestId("technology-eol-unrecognized-t-nodate")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-unknown-t-nodate")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-unchecked-t-nodate")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-badge-t-nodate")).not.toBeInTheDocument();
    expect(screen.getByTestId("technology-eol-none-t-nodate")).toHaveTextContent("—");
  });

  it("affiche « — » pour une ligne sans version, même sans cycle apparié", async () => {
    renderWithTechnologies([makeResolvedTechnology({ id: "t-noversion", version: null, eolCycle: null })]);

    await screen.findByTestId("technology-table");

    expect(screen.queryByTestId("technology-eol-unrecognized-t-noversion")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-unknown-t-noversion")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-unchecked-t-noversion")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-badge-t-noversion")).not.toBeInTheDocument();
    expect(screen.getByTestId("technology-eol-none-t-noversion")).toHaveTextContent("—");
  });

  // Ordre des conditions : une ligne qui porte un statut ou une date garde son badge, quel que
  // soit eolCycle — c'est aussi le cas des lignes antérieures à la colonne, jamais recalculées.
  it("garde le badge « Fin de vie » même sans cycle apparié quand une date est connue", async () => {
    renderWithTechnologies([makeResolvedTechnology({ id: "t-legacy", eolCycle: null, eolDate: new Date("2020-01-01T00:00:00Z") })]);

    const badge = await screen.findByTestId("technology-eol-badge-t-legacy");

    expect(badge).toBeVisible();
    expect(screen.queryByTestId("technology-eol-unrecognized-t-legacy")).not.toBeInTheDocument();
  });
});

// #2454 : une date saisie à la main porte eolProduct null et eolCheckedAt renseigné, comme un
// produit non suivi. Elle doit garder son badge et sa date, signaler son origine, et n'afficher
// aucun des trois états d'erreur d'endoflife.date.
describe("technologyTab — fin de vie saisie à la main (#2454)", () => {
  beforeEach(() => {
    findAllMock.mockReset();
    listEolProductsMock.mockReset();
  });

  it("garde le badge et ajoute la mention « saisie manuelle », sans aucun état d'erreur", async () => {
    renderWithTechnologies([makeManualTechnology({ id: "t-manual", eolDate: new Date(Date.now() + 30 * day) })]);

    const badge = await screen.findByTestId("technology-eol-soon-badge-t-manual");
    expect(badge).toBeVisible();
    expect(badge).toHaveTextContent("Fin de vie proche");

    const mention = screen.getByTestId("technology-eol-manual-t-manual");
    expect(mention).toBeVisible();
    expect(mention).toHaveTextContent("saisie manuelle");
    expect(mention).toHaveAttribute("title", expect.stringContaining("non vérifiée auprès d’endoflife.date"));
    // Le complément est restitué hors title, pour le clavier et les lecteurs d'écran.
    expect(mention).toHaveTextContent("renseignée à la main");

    expect(screen.queryByTestId("technology-eol-unknown-t-manual")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-unchecked-t-manual")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-unrecognized-t-manual")).not.toBeInTheDocument();
  });

  it("affiche le badge « Fin de vie » d'une date manuelle dépassée", async () => {
    renderWithTechnologies([makeManualTechnology({ id: "t-manual-eol", eolDate: new Date("2020-01-01T00:00:00Z") })]);

    expect(await screen.findByTestId("technology-eol-badge-t-manual-eol")).toHaveTextContent("Fin de vie");
    expect(screen.getByTestId("technology-eol-manual-t-manual-eol")).toBeVisible();
  });

  // Sans la garde sur eolSource, cette ligne (eolProduct null + eolCheckedAt renseigné)
  // tomberait dans « Produit non suivi ».
  it("ne prend jamais une ligne manuelle pour un produit non suivi, même sans date", async () => {
    renderWithTechnologies([makeManualTechnology({ id: "t-manual-nodate", eolDate: null })]);

    await screen.findByTestId("technology-table");

    expect(screen.queryByTestId("technology-eol-unknown-t-manual-nodate")).not.toBeInTheDocument();
    expect(screen.queryByTestId("technology-eol-unchecked-t-manual-nodate")).not.toBeInTheDocument();
    expect(screen.getByTestId("technology-eol-manual-t-manual-nodate")).toBeVisible();
  });

  it("ne mentionne pas « saisie manuelle » sur une ligne calculée", async () => {
    renderWithTechnologies([
      makeTechnology({
        id: "t-auto",
        eolCheckedAt: new Date("2026-09-01T00:00:00Z"),
        eolProduct: "python",
        eolDate: new Date(Date.now() + 30 * day),
      }),
    ]);

    await screen.findByTestId("technology-eol-soon-badge-t-auto");

    expect(screen.queryByTestId("technology-eol-manual-t-auto")).not.toBeInTheDocument();
  });
});

describe("technologyTab — titre", () => {
  beforeEach(() => {
    findAllMock.mockReset();
    listEolProductsMock.mockReset();
  });

  // #2413 : l'onglet s'appelle désormais « Technologies » (l'en-tête de colonne « Technologie »,
  // famille d'une ligne, reste au singulier).
  it("titre la section « Technologies »", async () => {
    renderWithTechnologies([makeTechnology({ id: "t-1" })]);

    await screen.findByTestId("technology-table");

    expect(screen.getByRole("heading", { level: 3, name: "Technologies" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3, name: "Technologie" })).not.toBeInTheDocument();
  });
});

// #2512 : le client généré ne lève pas sur un 4xx/5xx. Un 409 (doublon) ou un 403 doit se
// solder par un toast d'erreur portant le message du backend, jamais par un succès.
describe("technologyTab — erreurs HTTP de sauvegarde et de suppression (#2512)", () => {
  const httpError = (status: number, message: string) => ({
    response: { ok: false, status },
    error: { statusCode: status, message },
    data: undefined,
  });

  // Le focus-trap de DsfrModal ne trouve aucun nœud focalisable dans jsdom : la modale est
  // remplacée par son contenu, ce qui suffit pour atteindre le formulaire et la confirmation.
  const modalStub = { props: ["opened"], template: '<div v-if="opened"><slot /></div>' };

  function renderEditable(technologies: TechnologyDto[]) {
    findAllMock.mockResolvedValue({ response: { ok: true }, data: technologies });
    listEolProductsMock.mockResolvedValue({ response: { ok: true }, data: [] });
    return render(TechnologyTab, {
      props: { application: { ...applicationFixture, myPerms: new Set(["TechnologyWrite"]) } as ApplicationWithPerms },
      global: { plugins: [[PrimeVue, { theme: { preset: Aura } }]], stubs: { DsfrModal: modalStub } },
    });
  }

  async function openCreateFormAndSubmit() {
    await fireEvent.click(await screen.findByTestId("technology-add-btn"));
    await fireEvent.update(await screen.findByTestId("technology-name-input"), "Base de données");
    await fireEvent.update(screen.getByTestId("technology-product-input"), "PostgreSQL");
    // L’attribut data-testid posé sur <TechnologyForm> par l’onglet remplace celui du <form>.
    await fireEvent.submit(screen.getByTestId("technology-form-container"));
  }

  it("annonce l'erreur du backend quand la création répond 409, sans toast de succès ni rechargement", async () => {
    hasPermissions.mockReturnValue(true);
    createMock.mockResolvedValue(httpError(409, "Ce produit est déjà renseigné pour cette technologie et cette application"));
    renderEditable([]);
    await screen.findByTestId("technology-empty-state");
    findAllMock.mockClear();

    await openCreateFormAndSubmit();

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(addErrorMessage).toHaveBeenCalledWith("Ce produit est déjà renseigné pour cette technologie et cette application"),
    );
    expect(addSuccessMessage).not.toHaveBeenCalled();
    expect(findAllMock).not.toHaveBeenCalled();
  });

  it("retombe sur un message générique quand le backend n'en fournit pas", async () => {
    hasPermissions.mockReturnValue(true);
    createMock.mockResolvedValue({ response: { ok: false, status: 500 }, error: undefined, data: undefined });
    renderEditable([]);
    await screen.findByTestId("technology-empty-state");

    await openCreateFormAndSubmit();

    await waitFor(() => expect(addErrorMessage).toHaveBeenCalledWith("Erreur lors de la sauvegarde de la technologie."));
    expect(addSuccessMessage).not.toHaveBeenCalled();
  });

  it("annonce le succès et recharge la liste quand la création répond 201", async () => {
    hasPermissions.mockReturnValue(true);
    createMock.mockResolvedValue({ response: { ok: true, status: 201 }, data: {} });
    renderEditable([]);
    await screen.findByTestId("technology-empty-state");
    findAllMock.mockClear();

    await openCreateFormAndSubmit();

    await waitFor(() => expect(addSuccessMessage).toHaveBeenCalledWith("Technologie sauvegardée avec succès !"));
    expect(addErrorMessage).not.toHaveBeenCalled();
    expect(findAllMock).toHaveBeenCalledTimes(1);
  });

  it("annonce l'erreur du backend quand la suppression répond 403", async () => {
    hasPermissions.mockReturnValue(true);
    deleteMock.mockResolvedValue(httpError(403, "Accès refusé"));
    renderEditable([makeTechnology({ id: "t-1" })]);
    await screen.findByTestId("technology-eol-unchecked-t-1");

    await fireEvent.click(screen.getByTestId("technology-delete-btn"));
    await fireEvent.click(await screen.findByTestId("delete-confirm-btn"));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(addErrorMessage).toHaveBeenCalledWith("Accès refusé"));
    expect(addSuccessMessage).not.toHaveBeenCalled();
  });
});

// #2520 : le catalogue endoflife.date (≈ 40 Ko) n'est plus chargé au montage, mais à la première
// ouverture du formulaire, une seule fois par onglet.
describe("technologyTab — chargement du catalogue endoflife.date (#2520)", () => {
  const modalStub = { props: ["opened"], template: '<div v-if="opened"><slot /></div>' };

  it("ne charge le catalogue qu'à l'ouverture du formulaire, une seule fois", async () => {
    hasPermissions.mockReturnValue(true);
    findAllMock.mockResolvedValue({ response: { ok: true }, data: [] });
    listEolProductsMock.mockReset().mockResolvedValue({ response: { ok: true }, data: [{ name: "postgresql", label: "PostgreSQL" }] });
    render(TechnologyTab, {
      props: { application: { ...applicationFixture, myPerms: new Set(["TechnologyWrite"]) } as ApplicationWithPerms },
      global: { plugins: [[PrimeVue, { theme: { preset: Aura } }]], stubs: { DsfrModal: modalStub } },
    });
    await screen.findByTestId("technology-empty-state");
    expect(listEolProductsMock).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByTestId("technology-add-btn"));
    await screen.findByTestId("technology-name-input");
    await waitFor(() => expect(listEolProductsMock).toHaveBeenCalledTimes(1));

    await fireEvent.click(screen.getByTestId("technology-cancel-btn"));
    await fireEvent.click(screen.getByTestId("technology-add-btn"));
    await screen.findByTestId("technology-name-input");
    expect(listEolProductsMock).toHaveBeenCalledTimes(1);
  });
});
