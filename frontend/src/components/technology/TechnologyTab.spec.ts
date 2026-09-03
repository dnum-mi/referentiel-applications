import Aura from "@primevue/themes/aura";
import { cleanup, render, screen } from "@testing-library/vue";
import PrimeVue from "primevue/config";
import type { TechnologyDto } from "@/client/types.gen";
import type { ApplicationWithPerms } from "@/models/Application";
import TechnologyTab from "./TechnologyTab.vue";

afterEach(() => cleanup());

const findAllMock = vi.fn();
const listEolProductsMock = vi.fn();

vi.mock("@/api/index", () => ({
  default: {
    technologyControllerFindAll: (...args: unknown[]) => findAllMock(...args),
    technologyControllerListEolProducts: (...args: unknown[]) => listEolProductsMock(...args),
  },
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({
    addErrorMessage: vi.fn(),
    addSuccessMessage: vi.fn(),
  }),
}));

vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    hasPermissions: vi.fn().mockReturnValue(false),
  }),
}));

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
    ...overrides,
  };
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
