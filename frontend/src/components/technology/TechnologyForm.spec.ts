import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import type { EolProductDto, TechnologyDto } from "@/client/types.gen";
import TechnologyForm from "./TechnologyForm.vue";

afterEach(() => cleanup());

// Catalogue endoflife.date minimal : PostgreSQL est suivi, tout autre produit est inconnu.
const catalog: EolProductDto[] = [{ name: "postgresql", label: "PostgreSQL", category: "db", aliases: ["postgres"] }];

// Ligne automatique « neutre » : produit suivi, jamais vérifiée. Chaque cas surcharge ce qu'il teste.
function makeTechnology(overrides: Partial<TechnologyDto> = {}): TechnologyDto {
  return {
    id: "t-1",
    applicationId: "app-1",
    technology: "Base de données",
    product: "PostgreSQL",
    version: "15",
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

function renderForm(props: { initialData?: TechnologyDto; eolProducts?: EolProductDto[] } = {}) {
  return render(TechnologyForm, { props: { eolProducts: catalog, ...props } });
}

/** Soumet le formulaire et renvoie la charge émise par `submit`. */
async function submit(emitted: () => Record<string, unknown[]>): Promise<Record<string, unknown>> {
  await fireEvent.submit(screen.getByTestId("technology-form"));
  const events = emitted().submit;
  expect(events).toHaveLength(1);
  return (events[0] as [Record<string, unknown>])[0];
}

const manualInput = () => screen.queryByTestId("technology-manual-eol-input");
const automaticHint = () => screen.queryByTestId("technology-automatic-eol-hint");

// #2454 : la saisie manuelle n'est proposée que là où endoflife.date ne peut pas répondre.
// Partout ailleurs, elle inviterait à écraser une date vérifiée par une date qui ne le sera plus.
describe("technologyForm — fin de vie saisie à la main (#2454)", () => {
  it("masque le champ pour un produit du catalogue, et n'émet pas manualEolDate", async () => {
    const { emitted } = renderForm();
    await fireEvent.update(screen.getByTestId("technology-name-input"), "Base de données");
    await fireEvent.update(screen.getByTestId("technology-product-input"), "postgres");

    expect(manualInput()).not.toBeInTheDocument();
    expect(automaticHint()).not.toBeInTheDocument();

    const payload = await submit(emitted);
    expect(payload.product).toBe("postgres");
    // Clé absente ou `undefined` : l'onglet ne la transmet pas, le backend ne touche à rien.
    expect(payload.manualEolDate).toBeUndefined();
  });

  it("propose le champ dès que le produit saisi est hors catalogue, et émet la date saisie", async () => {
    const { emitted } = renderForm();
    await fireEvent.update(screen.getByTestId("technology-name-input"), "Logiciel interne");
    await fireEvent.update(screen.getByTestId("technology-product-input"), "Outil maison");

    const input = manualInput();
    expect(input).toBeVisible();
    expect(input).toHaveAttribute("type", "date");
    // Le champ dit lui-même quand s'en servir — et comment revenir à l'automatique.
    expect(screen.getByText(/Effacer la date rend la main au calcul automatique/)).toBeInTheDocument();

    await fireEvent.update(input!, "2027-06-30");

    expect((await submit(emitted)).manualEolDate).toBe("2027-06-30");
  });

  it("propose le champ quand le catalogue est indisponible, et émet null s'il reste vide", async () => {
    const { emitted } = renderForm({ eolProducts: [] });
    await fireEvent.update(screen.getByTestId("technology-name-input"), "Base de données");
    await fireEvent.update(screen.getByTestId("technology-product-input"), "PostgreSQL");

    expect(manualInput()).toBeVisible();

    // Champ proposé mais vide : `null`, pour que le backend efface une éventuelle saisie
    // et rende la main au calcul automatique.
    expect((await submit(emitted)).manualEolDate).toBeNull();
  });

  it("préremplit le champ avec la date d'une ligne manuelle, et émet null quand on l'efface", async () => {
    const { emitted } = renderForm({
      initialData: makeTechnology({
        product: "Outil maison",
        eolSource: "manual",
        eolDate: new Date("2027-06-30T00:00:00Z"),
        eolCheckedAt: new Date("2026-09-01T00:00:00Z"),
      }),
    });

    const input = manualInput();
    expect(input).toBeVisible();
    expect(input).toHaveValue("2027-06-30");

    await fireEvent.update(input!, "");

    expect((await submit(emitted)).manualEolDate).toBeNull();
  });

  // Produit non suivi, version non reconnue, cycle sans échéance : l'automatique a répondu
  // sans donner de date, la main est laissée au gestionnaire.
  it("propose le champ pour une ligne vérifiée sans échéance automatique, même si le produit est du catalogue", async () => {
    renderForm({
      initialData: makeTechnology({ eolCheckedAt: new Date("2026-09-01T00:00:00Z"), eolProduct: "postgresql", eolDate: null }),
    });

    expect(manualInput()).toBeVisible();
    expect(manualInput()).toHaveValue("");
  });

  // Ligne créée pendant une panne d'endoflife.date : jamais vérifiée, alors que le catalogue
  // en cache est encore servi. Sans ce cas, le gestionnaire n'aurait aucun moyen de saisir
  // la date qu'il connaît tant que la résolution n'a pas réussi.
  it("propose le champ pour une ligne jamais vérifiée, même si le produit est du catalogue, et émet null s'il reste vide", async () => {
    const { emitted } = renderForm({ initialData: makeTechnology({ eolCheckedAt: null, eolDate: null }) });

    expect(manualInput()).toBeVisible();
    expect(automaticHint()).not.toBeInTheDocument();
    expect((await submit(emitted)).manualEolDate).toBeNull();
  });

  it("rappelle en lecture seule la date calculée d'une ligne automatique, sans proposer le champ", async () => {
    const { emitted } = renderForm({
      initialData: makeTechnology({
        eolCheckedAt: new Date("2026-09-01T00:00:00Z"),
        eolProduct: "postgresql",
        eolCycle: "15",
        eolDate: new Date("2027-11-11T00:00:00Z"),
      }),
    });

    expect(manualInput()).not.toBeInTheDocument();
    expect(automaticHint()).toHaveTextContent("Fin de vie calculée automatiquement : 11/11/2027");

    expect((await submit(emitted)).manualEolDate).toBeUndefined();
  });
});
