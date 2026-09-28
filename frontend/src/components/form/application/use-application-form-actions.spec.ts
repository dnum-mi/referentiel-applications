import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type api from "@/api";
import type { ActorDto, ApplicationDto, MaiaOrganizationSuggestionDto, OrganizationDto } from "@/client/types.gen";
import type { APP_PERMISSIONS, ApplicationWithPerms } from "@/models/Application";
import type { useApplicationStore } from "@/stores/applicationStore";
import type { useOrganizationStore } from "@/stores/organizationStore";
import type { useToasterStore } from "@/stores/toasterStore";
import type { ApplicationFormData, ApplicationFormMode } from "./application-form.types";
import { useApplicationFormActions } from "./use-application-form-actions";

type ApplicationStore = ReturnType<typeof useApplicationStore>;
type OrganizationStore = ReturnType<typeof useOrganizationStore>;
type ToasterStore = ReturnType<typeof useToasterStore>;
type CreateResponse = Awaited<ReturnType<typeof api.applicationControllerCreate<false>>>;
type ActorResponse = Awaited<ReturnType<typeof api.applicationActorsControllerCreate<false>>>;
type MaiaResponse = Awaited<ReturnType<typeof api.userControllerSyncOrganizationFromMaiaByEmail<false>>>;

const mocks = vi.hoisted(() => {
  const applicationsById: ApplicationStore["applicationsById"] = {};
  return {
    createApplication: vi.fn<typeof api.applicationControllerCreate<false>>(),
    createActor: vi.fn<typeof api.applicationActorsControllerCreate<false>>(),
    syncMaia: vi.fn<typeof api.userControllerSyncOrganizationFromMaiaByEmail<false>>(),
    patchApplication: vi.fn<ApplicationStore["patchApplication"]>(),
    applicationsById,
    getOrganization: vi.fn<OrganizationStore["getById"]>(),
    addSuccessMessage: vi.fn<ToasterStore["addSuccessMessage"]>(),
    addErrorMessage: vi.fn<ToasterStore["addErrorMessage"]>(),
  };
});

vi.mock("@/api", () => ({
  default: {
    applicationControllerCreate: mocks.createApplication,
    applicationActorsControllerCreate: mocks.createActor,
    userControllerSyncOrganizationFromMaiaByEmail: mocks.syncMaia,
  },
}));
vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({ patchApplication: mocks.patchApplication, applicationsById: mocks.applicationsById }),
}));
vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: () => ({ getById: mocks.getOrganization }),
}));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addSuccessMessage: mocks.addSuccessMessage, addErrorMessage: mocks.addErrorMessage }),
}));

function success<T>(data: T, status = 200) {
  return { data, error: undefined, request: new Request("http://localhost/api/v2/test"), response: new Response(null, { status }) };
}

function httpError(error: unknown, status = 400) {
  return { data: undefined, error, request: new Request("http://localhost/api/v2/test"), response: new Response(null, { status }) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function application(overrides: Partial<ApplicationDto> = {}): ApplicationDto {
  return {
    id: "app-created",
    label: "Application enregistrée",
    description: "Description",
    shortName: null,
    logo: null,
    targetPopulations: [],
    purposes: [],
    quality: 0,
    ...overrides,
  };
}

function organization(id = "maia-org"): OrganizationDto {
  return { id, path: `Direction/${id}`, url: null, sigle: null, parentId: null, businessDivisionId: null };
}

function maiaSuggestion(organizationId: string | null = "maia-org"): MaiaOrganizationSuggestionDto {
  return {
    organizationId,
    organizationPath: organizationId ? `Direction/${organizationId}` : null,
    firstName: "Prénom MAIA",
    lastName: "Nom MAIA",
    fullName: "Prénom MAIA Nom MAIA",
  };
}

const createdActor: ActorDto = { id: "actor-created", actorTypeId: "type-moa" };

function setup(initialMode: ApplicationFormMode = "create", initialId: string | undefined = "app-existing") {
  const data = ref<ApplicationFormData>({
    application: {
      label: "Application saisie",
      description: "Description saisie",
      purposes: ["", " ", "Finalité", " Autre finalité "],
      targetPopulations: ["\t", "Population"],
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
  });
  const mode = ref(initialMode);
  const id = ref<string | undefined>(initialId);
  return {
    data,
    mode,
    id,
    ...useApplicationFormActions(
      () => data.value,
      () => mode.value,
      () => id.value,
    ),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  for (const id of Object.keys(mocks.applicationsById)) delete mocks.applicationsById[id];
  mocks.createApplication.mockResolvedValue(success(application(), 201));
  mocks.createActor.mockResolvedValue(success(createdActor, 201));
  mocks.syncMaia.mockResolvedValue(success(maiaSuggestion()));
  mocks.getOrganization.mockImplementation(async (id) => organization(id));
  mocks.patchApplication.mockResolvedValue({ ...application({ id: "app-existing" }), myPerms: new Set<APP_PERMISSIONS>() });
});

describe("enregistrement d'une application", () => {
  it("crée l'application puis ses deux contacts et retire les lignes vides sans muter la saisie", async () => {
    const { data, save, isSubmitting } = setup();
    const originalPurposes = [...data.value.application.purposes];

    expect(await save()).toEqual(application());
    expect(mocks.createApplication).toHaveBeenCalledExactlyOnceWith({
      body: { ...data.value.application, purposes: ["Finalité", " Autre finalité "], targetPopulations: ["Population"] },
    });
    expect(mocks.createActor).toHaveBeenNthCalledWith(1, {
      path: { applicationId: "app-created" },
      body: { ...data.value.moa, applicationId: "app-created" },
    });
    expect(mocks.createActor).toHaveBeenNthCalledWith(2, {
      path: { applicationId: "app-created" },
      body: { ...data.value.moe, applicationId: "app-created" },
    });
    expect(data.value.application.purposes).toEqual(originalPurposes);
    expect(mocks.addSuccessMessage).toHaveBeenCalledExactlyOnceWith("Application créée avec succès !");
    expect(mocks.addErrorMessage).not.toHaveBeenCalled();
    expect(isSubmitting.value).toBe(false);
  });

  it("omet les noms individuels des contacts de type groupe", async () => {
    const { data, save } = setup();
    data.value.moa.isGroup = true;
    data.value.moe.isGroup = true;

    await save();

    for (const role of ["moa", "moe"] as const) {
      expect(mocks.createActor).toHaveBeenCalledWith({
        path: { applicationId: "app-created" },
        body: { ...data.value[role], firstname: undefined, lastname: undefined, applicationId: "app-created" },
      });
    }
  });

  it.each([
    { error: { message: "Nom déjà utilisé" }, expected: "Nom déjà utilisé" },
    { error: { message: ["Nom incorrect", "Description requise"] }, expected: "Nom incorrect Description requise" },
    { error: { statusCode: 403 }, expected: "Une erreur est survenue" },
  ])("affiche le refus HTTP de création : $expected", async ({ error, expected }) => {
    const { save, isSubmitting } = setup();
    mocks.createApplication.mockResolvedValueOnce(httpError(error));

    expect(await save()).toBeUndefined();
    expect(mocks.createActor).not.toHaveBeenCalled();
    expect(mocks.addSuccessMessage).not.toHaveBeenCalled();
    expect(mocks.addErrorMessage).toHaveBeenCalledExactlyOnceWith(expected);
    expect(isSubmitting.value).toBe(false);
  });

  it("termine le chargement après une erreur réseau de création", async () => {
    const { save, isSubmitting } = setup();
    mocks.createApplication.mockRejectedValueOnce(new TypeError("Connexion indisponible"));

    expect(await save()).toBeUndefined();
    expect(mocks.createActor).not.toHaveBeenCalled();
    expect(mocks.addSuccessMessage).not.toHaveBeenCalled();
    expect(mocks.addErrorMessage).toHaveBeenCalledExactlyOnceWith("Connexion indisponible");
    expect(isSubmitting.value).toBe(false);
  });

  it.each([1, 2])("signale une création partielle lorsque le contact %i est refusé par HTTP", async (failedContact) => {
    const { save, isSubmitting } = setup();
    if (failedContact === 2) mocks.createActor.mockResolvedValueOnce(success(createdActor, 201));
    mocks.createActor.mockResolvedValueOnce(httpError({ message: "Contact refusé" }, 403));

    expect(await save()).toBeUndefined();
    expect(mocks.createApplication).toHaveBeenCalledOnce();
    expect(mocks.createActor).toHaveBeenCalledTimes(failedContact);
    expect(mocks.addSuccessMessage).not.toHaveBeenCalled();
    expect(mocks.addErrorMessage).toHaveBeenCalledExactlyOnceWith(
      "Application créée mais erreur lors de l'ajout des acteurs MOA/MOE. Vous pouvez les ajouter manuellement.",
    );
    expect(isSubmitting.value).toBe(false);
  });

  it("signale aussi une création partielle en cas d'erreur réseau d'un contact", async () => {
    const { save, isSubmitting } = setup();
    mocks.createActor.mockRejectedValueOnce(new TypeError("Réseau indisponible"));

    expect(await save()).toBeUndefined();
    expect(mocks.addSuccessMessage).not.toHaveBeenCalled();
    expect(mocks.addErrorMessage).toHaveBeenCalledOnce();
    expect(isSubmitting.value).toBe(false);
  });

  it("bloque une double soumission et reste occupé jusqu'à la fin des contacts", async () => {
    const state = setup();
    const pendingApplication = deferred<CreateResponse>();
    const pendingActor = deferred<ActorResponse>();
    mocks.createApplication.mockReturnValueOnce(pendingApplication.promise);
    mocks.createActor.mockReturnValueOnce(pendingActor.promise);

    const firstSave = state.save();
    expect(state.isSubmitting.value).toBe(true);
    expect(await state.save()).toBeUndefined();
    expect(mocks.createApplication).toHaveBeenCalledOnce();

    pendingApplication.resolve(success(application(), 201));
    await vi.waitFor(() => expect(mocks.createActor).toHaveBeenCalledOnce());
    expect(state.isSubmitting.value).toBe(true);
    expect(mocks.addSuccessMessage).not.toHaveBeenCalled();
    expect(await state.save()).toBeUndefined();

    pendingActor.resolve(success(createdActor, 201));
    await firstSave;
    expect(state.isSubmitting.value).toBe(false);
    expect(mocks.createApplication).toHaveBeenCalledOnce();
    expect(mocks.createActor).toHaveBeenCalledTimes(2);
  });

  it("retourne et met en cache la réponse réelle de l'édition sans recréer les contacts", async () => {
    const state = setup("edit");
    const updated: ApplicationWithPerms = {
      ...application({ id: "app-existing", label: "Libellé retourné par le serveur" }),
      myPerms: new Set(["AppWrite"]),
    };
    mocks.patchApplication.mockResolvedValueOnce(updated);

    expect(await state.save()).toBe(updated);
    expect(mocks.patchApplication).toHaveBeenCalledExactlyOnceWith({
      ...state.data.value.application,
      id: "app-existing",
      purposes: ["Finalité", " Autre finalité "],
      targetPopulations: ["Population"],
    });
    expect(mocks.applicationsById["app-existing"]).toBe(updated);
    expect(mocks.createApplication).not.toHaveBeenCalled();
    expect(mocks.createActor).not.toHaveBeenCalled();
    expect(mocks.addSuccessMessage).toHaveBeenCalledExactlyOnceWith("Application mise à jour avec succès !");
    expect(state.isSubmitting.value).toBe(false);
  });

  it.each([
    { error: { message: "Modification interdite" }, message: "Modification interdite" },
    { error: new TypeError("Réseau indisponible"), message: "Réseau indisponible" },
  ])("termine une édition échouée sans modifier le cache : $message", async ({ error, message }) => {
    const state = setup("edit");
    mocks.patchApplication.mockRejectedValueOnce(error);

    expect(await state.save()).toBeUndefined();
    expect(mocks.applicationsById).toEqual({});
    expect(mocks.addSuccessMessage).not.toHaveBeenCalled();
    expect(mocks.addErrorMessage).toHaveBeenCalledExactlyOnceWith(message);
    expect(state.isSubmitting.value).toBe(false);
  });

  it("ne soumet pas une édition sans identifiant", async () => {
    const state = setup("edit");
    state.id.value = undefined;

    expect(await state.save()).toBeUndefined();
    expect(mocks.patchApplication).not.toHaveBeenCalled();
    expect(mocks.addSuccessMessage).not.toHaveBeenCalled();
    expect(state.isSubmitting.value).toBe(false);
  });
});

describe.each(["moa", "moe"] as const)("synchronisation MAIA du contact %s", (role) => {
  it("met à jour seulement le contact demandé et son organisation sélectionnée", async () => {
    const state = setup();
    const otherRole = role === "moa" ? "moe" : "moa";
    const otherBefore = { ...state.data.value[otherRole] };
    const initialOrganization = role === "moa" ? state.initialMoaOrganization : state.initialMoeOrganization;
    const otherInitialOrganization = role === "moa" ? state.initialMoeOrganization : state.initialMoaOrganization;

    await state.syncContact(role);

    expect(mocks.syncMaia).toHaveBeenCalledExactlyOnceWith({ path: { email: `${role}@example.fr` } });
    expect(mocks.getOrganization).toHaveBeenCalledExactlyOnceWith("maia-org");
    expect(state.data.value[role]).toMatchObject({ firstname: "Prénom MAIA", lastname: "Nom MAIA", organizationId: "maia-org" });
    expect(initialOrganization.value).toEqual(organization());
    expect(state.data.value[otherRole]).toEqual(otherBefore);
    expect(otherInitialOrganization.value).toBeNull();
    expect(mocks.addSuccessMessage).toHaveBeenCalledExactlyOnceWith(`Organisation ${role.toUpperCase()} synchronisée depuis MAIA`);
    expect(state.moaSyncing.value).toBe(false);
    expect(state.moeSyncing.value).toBe(false);
  });

  it("conserve l'organisation existante si MAIA n'en propose pas", async () => {
    const state = setup();
    mocks.syncMaia.mockResolvedValueOnce(success(maiaSuggestion(null)));

    await state.syncContact(role);

    expect(state.data.value[role]).toMatchObject({ firstname: "Prénom MAIA", lastname: "Nom MAIA", organizationId: `org-${role}` });
    expect(mocks.getOrganization).not.toHaveBeenCalled();
    expect(mocks.addSuccessMessage).not.toHaveBeenCalled();
  });

  it("refuse une demande sans email sans lancer de chargement", async () => {
    const state = setup();
    state.data.value[role].email = "";

    await state.syncContact(role);

    expect(mocks.syncMaia).not.toHaveBeenCalled();
    expect(mocks.addErrorMessage).toHaveBeenCalledExactlyOnceWith("L'email est requis pour synchroniser depuis MAIA");
    expect(state.moaSyncing.value).toBe(false);
    expect(state.moeSyncing.value).toBe(false);
  });

  it("ne remplace pas le contact sur un refus HTTP de MAIA", async () => {
    const state = setup();
    const previous = { ...state.data.value[role] };
    mocks.syncMaia.mockResolvedValueOnce(httpError({ message: "Introuvable" }, 404));

    await state.syncContact(role);

    expect(state.data.value[role]).toEqual(previous);
    expect(mocks.getOrganization).not.toHaveBeenCalled();
    expect(mocks.addSuccessMessage).not.toHaveBeenCalled();
    expect(mocks.addErrorMessage).toHaveBeenCalledExactlyOnceWith("Erreur lors de la synchronisation MAIA (email non trouvé)");
    expect(state.moaSyncing.value).toBe(false);
    expect(state.moeSyncing.value).toBe(false);
  });

  it("termine le chargement et affiche l'erreur réseau MAIA", async () => {
    const state = setup();
    mocks.syncMaia.mockRejectedValueOnce(new TypeError("Connexion interrompue"));

    await state.syncContact(role);

    expect(mocks.addSuccessMessage).not.toHaveBeenCalled();
    expect(mocks.addErrorMessage).toHaveBeenCalledExactlyOnceWith("Erreur lors de la synchronisation MAIA");
    expect(state.moaSyncing.value).toBe(false);
    expect(state.moeSyncing.value).toBe(false);
  });
});

describe("chargements indépendants des contacts", () => {
  it("ignore une seconde synchronisation du même contact sans arrêter la première", async () => {
    const state = setup();
    const pending = deferred<MaiaResponse>();
    mocks.syncMaia.mockReturnValueOnce(pending.promise);

    const sync = state.syncContact("moa");
    expect(state.moaSyncing.value).toBe(true);
    await state.syncContact("moa");
    expect(mocks.syncMaia).toHaveBeenCalledOnce();
    expect(state.moaSyncing.value).toBe(true);

    pending.resolve(success(maiaSuggestion()));
    await sync;
    expect(state.moaSyncing.value).toBe(false);
  });

  it("isole le chargement et l'échec MOA pendant qu'une synchronisation MOE reste en cours", async () => {
    const state = setup();
    const moa = deferred<MaiaResponse>();
    const moe = deferred<MaiaResponse>();
    mocks.syncMaia.mockReturnValueOnce(moa.promise).mockReturnValueOnce(moe.promise);

    const syncMoa = state.syncContact("moa");
    const syncMoe = state.syncContact("moe");
    expect(state.moaSyncing.value).toBe(true);
    expect(state.moeSyncing.value).toBe(true);

    moa.reject(new TypeError("Erreur MOA"));
    await syncMoa;
    expect(state.moaSyncing.value).toBe(false);
    expect(state.moeSyncing.value).toBe(true);
    expect(state.data.value.moa.firstname).toBe("Marie");

    moe.resolve(success(maiaSuggestion("maia-moe")));
    await syncMoe;
    expect(state.moeSyncing.value).toBe(false);
    expect(state.initialMoaOrganization.value).toBeNull();
    expect(state.initialMoeOrganization.value?.id).toBe("maia-moe");
    expect(mocks.addErrorMessage).toHaveBeenCalledOnce();
    expect(mocks.addSuccessMessage).toHaveBeenCalledExactlyOnceWith("Organisation MOE synchronisée depuis MAIA");
  });
});
