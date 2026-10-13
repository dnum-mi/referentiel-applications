import {
  GRIST_COLUMNS,
  GristApplication,
  REFAPP_COLUMN_IDS,
  formatActors,
} from "./grist-columns";

const actor = (
  code: string,
  fields: Partial<{
    email: string | null;
    firstname: string | null;
    lastname: string | null;
    organization: { sigle: string | null; path: string } | null;
  }>,
) => ({
  email: null,
  firstname: null,
  lastname: null,
  organization: null,
  ...fields,
  actorType: { code },
});

const application = {
  id: "a1",
  label: "Mon app",
  quality: 72,
  priorityRestart: "R1_STAR",
  hostings: [
    { hostingOption: { site: "Paris", provider: "OVH", platform: "K8s" } },
    { hostingOption: null },
  ],
  tags: [{ name: "x" }, { name: "y" }],
  actors: [
    actor("MOA", {
      email: "moa@ex.fr",
      organization: { sigle: "DNUM", path: "MI/DNUM" },
    }),
    actor("MOA", {
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@ex.fr",
    }),
    actor("MOE", { email: "moe@ex.fr" }),
    actor("RSSI", {}),
  ],
  businessDivisions: [{ label: "DGPN" }, { label: "DGGN" }],
  compliance: {
    dima_duration_hours: 24,
    pdma_duration_hours: 0,
    dsfr_implemented: true,
    rgpd_has_aipd: false,
    dima_recovery_plan: null,
    homologation_status: "en_cours",
    homologation_date_end: new Date("2027-03-31T22:30:00Z"),
  },
  rgaaScorePercentage: 55,
  currentStatus: { status: "in_production_decommissioning" },
  applicationViews: 12,
  technicalDebtInfo: {
    technicalMaturity: 3.5,
    businessMaturity: null,
    costContainment: 2,
  },
} as unknown as GristApplication;

describe("GRIST_COLUMNS", () => {
  it("écrit les valeurs affichées dans la page de recherche", () => {
    expect(
      Object.fromEntries(
        GRIST_COLUMNS.map(({ colId, value }) => [colId, value(application)]),
      ),
    ).toEqual({
      iq: "72%",
      nom: "Mon app",
      priorite: "R1*",
      hebergement: "Paris, ",
      tags: "x, y",
      moa: "DNUM (moa@ex.fr)\nAda Lovelace (ada@ex.fr)",
      moe: "moe@ex.fr",
      fournisseur: "OVH, ",
      plateforme: "K8s, ",
      responsable_hebergement: "",
      direction_metier: "DGPN\nDGGN",
      rsimm: "Acteur sans nom",
      dima: "24h",
      pdma: "0h",
      rgaa: "55%",
      dsfr: "Oui",
      rgpd: "Non",
      pra: "",
      homologation: "En cours d'homologation",
      // 31/03 22h30 UTC = 1er avril à Paris.
      date_fin_homologation: "01/04/2027",
      statut: "À décommissionner",
      nb_consultations: 12,
      maturite_technique: 3.5,
      maturite_metier: null,
      maitrise_couts_mco: 2,
    });
  });

  it("laisse vides les colonnes d'une application sans données", () => {
    const empty = {
      ...application,
      quality: null,
      priorityRestart: null,
      actors: [],
      compliance: null,
      rgaaScorePercentage: null,
      currentStatus: null,
      technicalDebtInfo: null,
    } as unknown as GristApplication;
    const values = Object.fromEntries(
      GRIST_COLUMNS.map(({ colId, value }) => [colId, value(empty)]),
    );

    expect(values).toMatchObject({
      iq: "",
      priorite: "",
      moa: "",
      dima: "",
      dsfr: "",
      homologation: "",
      date_fin_homologation: "",
      statut: "",
      maturite_technique: null,
    });
  });

  it("couvre chaque colonne de la page une seule fois", () => {
    const colIds = GRIST_COLUMNS.map(({ colId }) => colId);
    expect(new Set(colIds).size).toBe(colIds.length);
    expect(new Set(GRIST_COLUMNS.map(({ field }) => field)).size).toBe(
      colIds.length,
    );
    expect(REFAPP_COLUMN_IDS).toEqual(
      new Set([...colIds, "dans_selection", "motif_sortie"]),
    );
  });

  it("réserve à ColumnRead les mêmes colonnes que la page", () => {
    expect(
      GRIST_COLUMNS.filter(({ restricted }) => !restricted).map(
        ({ field }) => field,
      ),
    ).toEqual([
      "quality",
      "label",
      "priorityRestart",
      "tag",
      "businessDivision",
      "status",
      "applicationViews",
      "technicalMaturity",
      "businessMaturity",
      "costContainment",
    ]);
  });
});

describe("formatActors", () => {
  it("n'ajoute pas l'e-mail déjà présent dans le nom", () => {
    expect(
      formatActors([actor("MOE", { email: "x@ex.fr" })] as never, "MOE"),
    ).toBe("x@ex.fr");
  });
});
