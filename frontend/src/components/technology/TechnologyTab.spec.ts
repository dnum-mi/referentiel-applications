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
    ...overrides,
  };
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
