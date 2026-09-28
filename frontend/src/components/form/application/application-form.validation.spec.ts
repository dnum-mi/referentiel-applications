import { describe, expect, it } from "vitest";
import { ref } from "vue";
import type { ApplicationFormData, ApplicationFormMode } from "./application-form.types";
import { useApplicationFormValidation } from "./application-form.validation";

function createValidData(): ApplicationFormData {
  return {
    application: {
      label: "Application de test",
      description: "Description de l'application",
      purposes: [],
      targetPopulations: [],
      status: { status: "to_validate" },
    },
    moa: {
      actorTypeId: "type-moa",
      email: "moa@example.fr",
      organizationId: "org-moa",
      firstname: "Marie",
      lastname: "Dupont",
      isGroup: false,
    },
    moe: {
      actorTypeId: "type-moe",
      email: "moe@example.fr",
      organizationId: "org-moe",
      firstname: "Jean",
      lastname: "Martin",
      isGroup: false,
    },
  };
}

function setup() {
  const data = ref(createValidData());
  const mode = ref<ApplicationFormMode>("create");
  const validation = useApplicationFormValidation(
    () => data.value,
    () => mode.value,
  );
  return { data, mode, ...validation };
}

describe("validation des informations principales", () => {
  it.each(["", " \t\n "])("refuse les champs vides ou composés d'espaces (%j)", (empty) => {
    const { data, validateStep, errors } = setup();
    data.value.application.label = empty;
    data.value.application.description = empty;

    expect(validateStep(1)).toEqual([
      { field: "label", step: 1, message: "Le nom de l'application est obligatoire." },
      { field: "description", step: 1, message: "La description est obligatoire." },
    ]);
    expect(errors.value).toEqual({ label: "Le nom de l'application est obligatoire.", description: "La description est obligatoire." });
  });

  it("accepte du contenu sans modifier la saisie ni imposer de longueur supplémentaire", () => {
    const { data, validateStep } = setup();
    data.value.application.label = " A ";
    data.value.application.description = " D ";

    expect(validateStep(1)).toEqual([]);
    expect(data.value.application.label).toBe(" A ");
    expect(data.value.application.description).toBe(" D ");
  });
});

describe("validation des détails facultatifs", () => {
  it("autorise l'étape vide sans réévaluer les informations principales ni les contacts", () => {
    const { data, validateStep, errors } = setup();
    data.value.application.label = "";
    data.value.application.description = "";
    data.value.moa.email = "";

    expect(validateStep(2)).toEqual([]);
    expect(errors.value).toEqual({});
  });
});

describe.each([
  { role: "moa", label: "MOA", step: 3 },
  { role: "moe", label: "MOE", step: 4 },
] as const)("validation du contact $label", ({ role, label, step }) => {
  it("retourne tous les champs obligatoires dans l'ordre affiché", () => {
    const { data, validateStep } = setup();
    data.value[role] = { actorTypeId: "type", isGroup: false };

    expect(validateStep(step)).toEqual([
      { field: `${role}.email`, step, message: `L'email du contact ${label} est obligatoire.` },
      { field: `${role}.organizationId`, step, message: `L'organisation ${label} est obligatoire.` },
      { field: `${role}.firstname`, step, message: `Le prénom du contact ${label} est obligatoire.` },
      { field: `${role}.lastname`, step, message: `Le nom du contact ${label} est obligatoire.` },
    ]);
  });

  it("accepte un individu complet et les espaces entourant son email", () => {
    const { data, validateStep, errors } = setup();
    data.value[role].email = "  contact+refapp@example.fr  ";

    expect(validateStep(step)).toEqual([]);
    expect(errors.value).toEqual({});
  });

  it.each(["invalid-email", "contact@", "contact @example.fr", "   "])("conserve le message et le format attendus pour %j", (email) => {
    const { data, validateStep } = setup();
    data.value[role].email = email;

    expect(validateStep(step)).toEqual([
      { field: `${role}.email`, step, message: `L'email du contact ${label} est invalide. Format attendu – ex : exemple@mail.fr` },
    ]);
  });

  it("exige toujours email et organisation pour un groupe", () => {
    const { data, validateStep } = setup();
    data.value[role] = { actorTypeId: "type", isGroup: true };

    expect(validateStep(step)).toEqual([
      { field: `${role}.email`, step, message: `L'email du contact ${label} est obligatoire.` },
      { field: `${role}.organizationId`, step, message: `L'organisation ${label} est obligatoire.` },
    ]);
  });

  it("efface les erreurs de noms au passage en groupe et les réévalue au retour en individu", () => {
    const { data, validateStep, errors } = setup();
    data.value[role].firstname = "";
    data.value[role].lastname = "";
    expect(validateStep(step).map((issue) => issue.field)).toEqual([`${role}.firstname`, `${role}.lastname`]);

    data.value[role].isGroup = true;
    expect(validateStep(step)).toEqual([]);
    expect(errors.value).toEqual({});

    data.value[role].isGroup = false;
    expect(validateStep(step).map((issue) => issue.field)).toEqual([`${role}.firstname`, `${role}.lastname`]);
  });
});

describe("useApplicationFormValidation", () => {
  it("efface seulement les erreurs de l'étape réévaluée", () => {
    const { data, validateStep, errors } = setup();
    data.value.application.label = "";
    data.value.moa.email = "";
    data.value.moe.email = "";
    validateStep(1);
    validateStep(3);
    validateStep(4);

    data.value.moa.email = "corrige@example.fr";
    expect(validateStep(3)).toEqual([]);
    expect(errors.value).toEqual({
      label: "Le nom de l'application est obligatoire.",
      "moe.email": "L'email du contact MOE est obligatoire.",
    });

    validateStep(2);
    expect(errors.value).toEqual({
      label: "Le nom de l'application est obligatoire.",
      "moe.email": "L'email du contact MOE est obligatoire.",
    });
  });

  it("valide toutes les étapes dans leur ordre et efface les erreurs corrigées", () => {
    const { data, validateAll, errors } = setup();
    data.value.application.label = "";
    data.value.application.description = "";
    data.value.moa = { actorTypeId: "type-moa" };
    data.value.moe = { actorTypeId: "type-moe" };

    expect(validateAll().map(({ field, step }) => ({ field, step }))).toEqual([
      { field: "label", step: 1 },
      { field: "description", step: 1 },
      { field: "moa.email", step: 3 },
      { field: "moa.organizationId", step: 3 },
      { field: "moa.firstname", step: 3 },
      { field: "moa.lastname", step: 3 },
      { field: "moe.email", step: 4 },
      { field: "moe.organizationId", step: 4 },
      { field: "moe.firstname", step: 4 },
      { field: "moe.lastname", step: 4 },
    ]);

    data.value = createValidData();
    expect(validateAll()).toEqual([]);
    expect(errors.value).toEqual({});
  });

  it("ignore les contacts en édition et efface les erreurs d'une précédente création", () => {
    const { data, mode, validateAll, errors } = setup();
    data.value.moa = { actorTypeId: "" };
    data.value.moe = { actorTypeId: "" };
    expect(validateAll()).toHaveLength(8);

    mode.value = "edit";
    expect(validateAll()).toEqual([]);
    expect(errors.value).toEqual({});

    data.value.application.description = " ";
    expect(validateAll()).toEqual([{ field: "description", step: 1, message: "La description est obligatoire." }]);
  });

  it("ne conserve pas d'erreur de contact masqué lorsqu'une étape est réévaluée en édition", () => {
    const { data, mode, validateStep, errors } = setup();
    data.value.moa.email = "";
    validateStep(3);

    mode.value = "edit";
    expect(validateStep(3)).toEqual([]);
    expect(errors.value).toEqual({});
  });
});
