import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { reactive, ref } from "vue";
import { FeatureId, Permission } from "@/client";
import type { Filters } from "@/composables/use-application-search";
import { useColumnPreferences } from "@/composables/use-column-preferences";
import ApplicationSearchActions from "./ApplicationSearchActions.vue";

afterEach(() => cleanup());

const { hasPermissions, fetchUser, getConfig, user, downloadExcel, downloadHtml, addErrorMessage, resolve, filtersToQuery } = vi.hoisted(
  () => ({
    user: { gristDocIds: ["doc1"] as string[], gristUrl: "https://grist.example" as string | null, hasGristApiKey: true },
    hasPermissions: vi.fn(),
    fetchUser: vi.fn(),
    getConfig: vi.fn(),
    downloadExcel: vi.fn(),
    downloadHtml: vi.fn(),
    addErrorMessage: vi.fn(),
    resolve: vi.fn(),
    filtersToQuery: vi.fn(),
  }),
);

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn(), resolve }) }));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions, fetchUser, user: reactive(user), authenticated: true }) }));
vi.mock("@/services/config", () => ({ getConfig }));
vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({ downloadExcel, downloadHtml }),
}));
vi.mock("@/composables/use-application-search", () => ({
  useApplicationSearch: () => ({ filters, total, isLoading, isSearchPending, error, filtersToQuery }),
}));

const grantedPermissions = ref<Permission[]>([]);
const filters = ref<Filters>({});
const total = ref(0);
const isLoading = ref(false);
const isSearchPending = ref(false);
const error = ref<string | null>(null);

async function renderWith(permissions: Permission[]) {
  grantedPermissions.value = permissions;
  hasPermissions.mockImplementation((required: Permission[]) => required.some((p) => grantedPermissions.value.includes(p)));
  const rendered = render(ApplicationSearchActions, {
    global: {
      stubs: {
        ReportModal: true,
        CreateQualityCampaignModal: true,
        ColumnCustomization: true,
        RouterLink: { props: ["to"], template: '<a role="link"><slot /></a>' },
        GristSyncModal: {
          props: ["opened"],
          emits: ["close"],
          template:
            '<div data-testid="grist-sync-modal" :opened="String(opened)"><button v-if="opened" @click="$emit(\'close\')">Annuler la synchronisation</button></div>',
        },
      },
    },
  });
  await flushPromises();
  return rendered;
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchUser.mockResolvedValue(true);
  getConfig.mockResolvedValue({ betaFeatures: Object.values(FeatureId) });
  Object.assign(user, { gristDocIds: ["doc1"], gristUrl: "https://grist.example", hasGristApiKey: true });
  filters.value = { shortName: "app" };
  total.value = 42;
  isLoading.value = false;
  isSearchPending.value = false;
  error.value = null;
  useColumnPreferences().resetToDefaults();
});

describe("ApplicationSearchActions — synchronisation Grist", () => {
  it("masque le bouton sans la capacité BetaFeatures", async () => {
    await renderWith([Permission.DATA_EXPORT, Permission.GRIST_SYNC]);
    expect(screen.queryByTestId("grist-sync-btn")).toBeNull();
    expect(screen.queryByTestId("grist-sync-btn-mobile")).toBeNull();
  });

  it.each(["grist-sync-btn", "grist-sync-btn-mobile"])("affiche le badge bêta sur %s", async (testId) => {
    await renderWith([Permission.BETA_FEATURES]);
    const button = screen.getByTestId(testId);
    expect(button).toHaveTextContent("Bêta");
    expect(button).toHaveAccessibleName("Synchroniser avec Grist Bêta");
  });

  it("retire les boutons lorsque l’accès bêta est révoqué", async () => {
    await renderWith([Permission.BETA_FEATURES]);
    grantedPermissions.value = [];
    await flushPromises();
    expect(screen.queryByTestId("grist-sync-btn")).toBeNull();
    expect(screen.queryByTestId("grist-sync-btn-mobile")).toBeNull();
  });

  it.each([
    ["sans document", { gristDocIds: [] }],
    ["sans URL", { gristUrl: null }],
    ["sans clé d'API", { hasGristApiKey: false }],
  ])("désactive le bouton tant que le profil est %s", async (_, missing) => {
    Object.assign(user, missing);
    await renderWith([Permission.BETA_FEATURES]);

    const button = screen.getByTestId("grist-sync-btn");
    expect(button).toBeDisabled();
    for (const testId of ["grist-sync-btn", "grist-sync-btn-mobile"]) {
      const gristButton = screen.getByTestId(testId);
      expect(gristButton).toHaveAccessibleName("Synchroniser avec Grist Bêta");
      expect(gristButton).not.toHaveAttribute("title");
      expect(gristButton).not.toHaveAttribute("aria-label");
      expect(gristButton).toHaveAccessibleDescription(
        "Pour synchroniser, renseignez votre connexion et vos documents Grist dans l'onglet « Synchronisation Grist » de votre profil.",
      );
    }
    expect(screen.getByRole("link", { name: "Synchronisation Grist" })).toBeVisible();
  });

  it("ouvre la modale de synchronisation", async () => {
    await renderWith([Permission.BETA_FEATURES]);
    expect(screen.getByTestId("grist-sync-modal")).toHaveAttribute("opened", "false");
    expect(screen.getByTestId("grist-sync-btn")).toBeEnabled();
    expect(screen.getByTestId("grist-sync-btn")).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByRole("link", { name: "Synchronisation Grist" })).toBeNull();

    await fireEvent.click(screen.getByTestId("grist-sync-btn"));

    expect(screen.getByTestId("grist-sync-modal")).toHaveAttribute("opened", "true");
  });

  it("retire et rétablit l'aide avec la configuration du profil", async () => {
    user.hasGristApiKey = false;
    await renderWith([Permission.BETA_FEATURES]);
    expect(screen.getByTestId("grist-sync-btn")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Synchronisation Grist" })).toBeVisible();

    reactive(user).hasGristApiKey = true;
    await flushPromises();
    for (const testId of ["grist-sync-btn", "grist-sync-btn-mobile"]) {
      expect(screen.getByTestId(testId)).toBeEnabled();
      expect(screen.getByTestId(testId)).not.toHaveAttribute("aria-describedby");
      expect(screen.getByTestId(testId)).toHaveAccessibleName("Synchroniser avec Grist Bêta");
    }
    expect(screen.queryByRole("link", { name: "Synchronisation Grist" })).toBeNull();

    reactive(user).gristDocIds = [];
    await flushPromises();
    expect(screen.getByTestId("grist-sync-btn")).toBeDisabled();
    expect(screen.getByRole("link", { name: "Synchronisation Grist" })).toBeVisible();
  });

  it.each(["grist-sync-btn", "grist-sync-btn-mobile"])("rend le focus au bouton %s après annulation", async (testId) => {
    await renderWith([Permission.BETA_FEATURES]);
    const button = screen.getByTestId(testId);
    button.focus();
    await fireEvent.click(button);
    const cancel = screen.getByRole("button", { name: "Annuler la synchronisation" });
    cancel.focus();
    await fireEvent.click(cancel);
    expect(screen.getByTestId("grist-sync-modal")).toHaveAttribute("opened", "false");
    expect(button).toHaveFocus();
  });

  it("conserve l'export HTML à côté de la synchronisation et empêche un export concurrent", async () => {
    let finishExport: (() => void) | undefined;
    downloadHtml.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishExport = resolve;
      }),
    );
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    const htmlButton = screen.getByTestId("applications-export-html-btn");
    const excelButton = screen.getByTestId("application-export-btn");
    expect(screen.getByTestId("grist-sync-btn")).toBeEnabled();
    htmlButton.focus();
    await fireEvent.click(htmlButton);
    await flushPromises();
    expect(downloadHtml).toHaveBeenCalledExactlyOnceWith({ shortName: "app" });
    expect(screen.getAllByRole("status").some((status) => status.textContent?.includes("Préparation de l’export HTML…"))).toBe(true);
    expect(htmlButton).toHaveFocus();
    expect(htmlButton).toHaveAttribute("aria-disabled", "true");
    expect(htmlButton).toHaveAttribute("aria-busy", "true");
    expect(htmlButton).not.toHaveAttribute("disabled");
    await fireEvent.click(htmlButton);
    expect(downloadHtml).toHaveBeenCalledTimes(1);
    await fireEvent.click(excelButton);
    expect(downloadExcel).not.toHaveBeenCalled();
    finishExport?.();
    await vi.waitFor(() => expect(htmlButton).toHaveAttribute("aria-disabled", "false"));
    expect(htmlButton).toBeEnabled();
    await fireEvent.click(excelButton);
    await vi.waitFor(() => expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ iq__isNull: true }));
  });

  it("conserve l'erreur et le réessai de l'export HTML", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    downloadHtml.mockRejectedValueOnce(new Error("Échec simulé"));
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    const button = screen.getByTestId("applications-export-html-btn");
    button.focus();
    await fireEvent.click(button);
    await vi.waitFor(() =>
      expect(addErrorMessage).toHaveBeenCalledExactlyOnceWith("Une erreur est survenue lors de l'exportation HTML. Veuillez réessayer."),
    );
    expect(button).toBeEnabled();
    expect(button).toHaveFocus();
    await fireEvent.click(button);
    await flushPromises();
    expect(downloadHtml).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });
});

describe("ApplicationSearchActions — accès bêta de l'export Excel", () => {
  it.each([{ permissions: [] }, { permissions: [Permission.DATA_EXPORT] }])(
    "masque les exports bêta sans la capacité BetaFeatures ($permissions)",
    async ({ permissions }) => {
      await renderWith(permissions);
      expect(screen.queryByTestId("application-export-btn")).toBeNull();
      expect(screen.queryByTestId("application-export-btn-mobile")).toBeNull();
      expect(screen.queryByTestId("application-export-view-btn")).toBeNull();
      expect(screen.queryByTestId("applications-export-html-btn")).toBeNull();
    },
  );

  it("indique Bêta sur ordinateur et mobile et revérifie les droits avant téléchargement", async () => {
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    for (const testId of ["application-export-btn", "application-export-btn-mobile"]) {
      const button = screen.getByTestId(testId);
      expect(button).toHaveTextContent("Exporter la vue complète");
      expect(button).toHaveAccessibleName(/^Exporter la vue complète/);
      expect(button).toHaveTextContent("Bêta");
      expect(button).toHaveAccessibleName(/fonctionnalité bêta/);
      expect(button.querySelector(".fr-badge")?.tagName).toBe("SPAN");
      expect(button.querySelector(".fr-badge")).toHaveAttribute("aria-hidden", "true");
    }
    await fireEvent.click(screen.getByTestId("application-export-btn-mobile"));
    await vi.waitFor(() => expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ iq__isNull: true }));
    expect(fetchUser).toHaveBeenCalledTimes(1);
    expect(getConfig).toHaveBeenLastCalledWith({ refresh: true });
  });

  it("retire les boutons après révocation réactive et bloque un clic déjà capturé", async () => {
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    const button = screen.getByTestId("application-export-btn");
    grantedPermissions.value = [Permission.DATA_EXPORT];
    await fireEvent.click(button);
    expect(downloadExcel).not.toHaveBeenCalled();
    expect(screen.queryByTestId("application-export-btn")).toBeNull();
    expect(screen.queryByTestId("applications-export-html-btn")).toBeNull();
  });

  it("ne télécharge pas si /users/me révoque la capacité au moment du clic", async () => {
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    fetchUser.mockImplementationOnce(async () => {
      grantedPermissions.value = [Permission.DATA_EXPORT];
      return true;
    });
    await fireEvent.click(screen.getByTestId("application-export-btn"));
    await flushPromises();
    expect(downloadExcel).not.toHaveBeenCalled();
    expect(screen.queryByTestId("application-export-btn")).toBeNull();
  });

  it.each(["application-export-btn", "application-export-btn-mobile"])(
    "permet Excel avec DataExport seul quand le registre l'exclut de la bêta (%s, #3101)",
    async (testId) => {
      getConfig.mockResolvedValue({ betaFeatures: Object.values(FeatureId).filter((id) => id !== FeatureId.CATALOGUE_EXCEL_EXPORT) });
      await renderWith([Permission.DATA_EXPORT]);
      const button = screen.getByTestId(testId);
      expect(button).not.toHaveTextContent("Bêta");
      expect(screen.queryByTestId("applications-export-html-btn")).toBeNull();
      await fireEvent.click(button);
      await flushPromises();
      expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ iq__isNull: true });
    },
  );

  it.each(["application-export-btn", "application-export-btn-mobile"])(
    "bloque Excel si /users/me retire DataExport seul au clic (%s)",
    async (testId) => {
      getConfig.mockResolvedValue({ betaFeatures: Object.values(FeatureId).filter((id) => id !== FeatureId.CATALOGUE_EXCEL_EXPORT) });
      await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
      fetchUser.mockImplementationOnce(async () => {
        grantedPermissions.value = [Permission.BETA_FEATURES];
        return true;
      });
      await fireEvent.click(screen.getByTestId(testId));
      await flushPromises();
      expect(fetchUser).toHaveBeenCalledOnce();
      expect(downloadExcel).not.toHaveBeenCalled();
      expect(screen.getByTestId("application-export-btn")).toBeDisabled();
      expect(screen.getByTestId("application-export-btn-mobile")).toBeDisabled();
    },
  );

  it("la sortie de bêta retire le badge et laisse uniquement le droit DataExport", async () => {
    const config = reactive({ betaFeatures: Object.values(FeatureId) });
    getConfig.mockResolvedValue(config);
    await renderWith([Permission.DATA_EXPORT]);
    config.betaFeatures.splice(config.betaFeatures.indexOf(FeatureId.CATALOGUE_EXCEL_EXPORT), 1);
    await flushPromises();
    for (const testId of ["application-export-btn", "application-export-btn-mobile"]) {
      expect(screen.getByTestId(testId)).not.toHaveTextContent("Bêta");
      expect(screen.getByTestId(testId)).not.toHaveAccessibleName(/bêta/);
    }
    await fireEvent.click(screen.getByTestId("application-export-btn"));
    await vi.waitFor(() => expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ iq__isNull: true }));
  });

  it.each(["application-export-btn", "application-export-btn-mobile"])(
    "exporte tout le catalogue autorisé sans reprendre aucun filtre ou tri de l'écran (%s)",
    async (testId) => {
      filters.value = {
        search: "retenu",
        tag: ["exemple"],
        myApplications: true,
        subscribersEmail: true,
        organization: "MI/DNUM",
        currentStatus__in: ["deleted"],
        iqGte: 90,
        iqLte: 95,
        iq__isNull: false,
        technologyEolStatus: "eol",
        page: 2,
        pageSize: 1,
        sortBy: "quality",
        order: "desc",
      };
      await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
      fetchUser.mockImplementationOnce(async () => {
        filters.value = { search: "modifié pendant la revalidation", myApplications: true };
        return true;
      });
      const button = screen.getByTestId(testId);
      expect(button).toHaveTextContent("Exporter la vue complète");
      expect(button).toHaveAccessibleName(/^Exporter la vue complète, un classeur de toutes les applications autorisées/);
      await fireEvent.click(button);
      await vi.waitFor(() => expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ iq__isNull: true }));
      expect(filtersToQuery).not.toHaveBeenCalled();
      expect(fetchUser).toHaveBeenCalledOnce();
    },
  );
});

describe("ApplicationSearchActions — export Excel de la vue", () => {
  it("annonce le total et envoie les filtres et les colonnes visibles dans l'ordre du tableau", async () => {
    const selection: Filters = { search: "fiches", tag: ["exemple"], order: "desc" };
    const fullFilters: Filters = { ...selection, page: 2, pageSize: 5 };
    filters.value = fullFilters;
    useColumnPreferences().setVisibleColumns(["status", "businessDivision", "moa", "label", "quality"]);
    const query = { search: "fiches", tag: "exemple", order: "desc" };
    const cataloguePath = "/recherche-application?search=fiches&tag=exemple&order=desc";
    filtersToQuery.mockReturnValue(query);
    resolve.mockReturnValue({ href: cataloguePath });
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES, Permission.COLUMN_READ]);
    fetchUser.mockImplementationOnce(async () => {
      grantedPermissions.value = [Permission.DATA_EXPORT, Permission.BETA_FEATURES];
      return true;
    });

    const viewButton = screen.getByTestId("application-export-view-btn");
    expect(viewButton).toHaveTextContent("Exporter la vue filtrée");
    expect(viewButton).not.toHaveTextContent("42 applications");
    expect(viewButton).toHaveAccessibleName("Exporter la vue filtrée (42 applications) — fonctionnalité bêta");
    await fireEvent.click(viewButton);
    await vi.waitFor(() => {
      expect(downloadExcel).toHaveBeenCalledExactlyOnceWith(selection, {
        columns: ["quality", "label", "businessDivision", "status"],
        cataloguePath,
      });
    });
    expect(filtersToQuery).toHaveBeenCalledExactlyOnceWith(selection);
    expect(resolve).toHaveBeenCalledExactlyOnceWith({ name: "recherche-application", query });
    expect(fetchUser).toHaveBeenCalledOnce();
    expect(filters.value).toEqual(fullFilters);

    const completeButton = screen.getByTestId("application-export-btn");
    expect(completeButton).toHaveTextContent("Exporter la vue complète");
    expect(completeButton).toHaveAccessibleName(/^Exporter la vue complète/);
    await fireEvent.click(completeButton);
    await vi.waitFor(() => expect(downloadExcel).toHaveBeenLastCalledWith({ iq__isNull: true }));
    expect(downloadExcel).toHaveBeenCalledTimes(2);
  });

  it("bloque un export si le droit est retiré lors de sa revalidation", async () => {
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    fetchUser.mockImplementationOnce(async () => {
      grantedPermissions.value = [Permission.BETA_FEATURES];
      return true;
    });
    await fireEvent.click(screen.getByTestId("application-export-view-btn"));
    await flushPromises();
    expect(downloadExcel).not.toHaveBeenCalled();
    expect(screen.getByTestId("application-export-view-btn")).toBeDisabled();
  });

  it("garde la vue du clic si les filtres ou les colonnes changent pendant la revalidation", async () => {
    useColumnPreferences().setVisibleColumns(["status", "label"]);
    const cataloguePath = "/recherche-application?shortName=app";
    filtersToQuery.mockReturnValue({ shortName: "app" });
    resolve.mockReturnValue({ href: cataloguePath });
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    fetchUser.mockImplementationOnce(async () => {
      filters.value = { shortName: "autre" };
      useColumnPreferences().setVisibleColumns(["quality"]);
      return true;
    });

    await fireEvent.click(screen.getByTestId("application-export-view-btn"));
    await vi.waitFor(() =>
      expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ shortName: "app" }, { columns: ["label", "status"], cataloguePath }),
    );
  });

  it.each([false, true])("fige les filtres multiples modifiés sur place, y compris un tableau déjà proxifié (%s)", async (proxied) => {
    filters.value = { tag: ["au clic"], sortBy: "label", order: "desc", page: 1, pageSize: 2 };
    if (proxied) filters.value = { ...filters.value };
    useColumnPreferences().setVisibleColumns(["label"]);
    filtersToQuery.mockReturnValue({ tag: "au clic", sortBy: "label", order: "desc" });
    const cataloguePath = "/recherche-application?tag=au%20clic&sortBy=label&order=desc";
    resolve.mockReturnValue({ href: cataloguePath });
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    fetchUser.mockImplementationOnce(async () => {
      filters.value.tag?.push("ajouté ensuite");
      return true;
    });
    await fireEvent.click(screen.getByTestId("application-export-view-btn"));
    await vi.waitFor(() =>
      expect(downloadExcel).toHaveBeenCalledExactlyOnceWith(
        { tag: ["au clic"], sortBy: "label", order: "desc" },
        { columns: ["label"], cataloguePath },
      ),
    );
    expect(filters.value.tag).toEqual(["au clic", "ajouté ensuite"]);
  });

  it("ne déclenche pas d’export sans colonne affichée", async () => {
    useColumnPreferences().setVisibleColumns(["moa"]);
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    const button = screen.getByTestId("application-export-view-btn");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("title", "Sélectionnez au moins une colonne à exporter");
    await fireEvent.click(button);
    await flushPromises();
    expect(fetchUser).not.toHaveBeenCalled();
    expect(downloadExcel).not.toHaveBeenCalled();
  });

  it("n’annonce aucun ancien total pendant l’attente d’une recherche différée", async () => {
    isSearchPending.value = true;
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    const button = screen.getByTestId("application-export-view-btn");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toHaveAccessibleName(/42 applications/);
    await fireEvent.click(button);
    expect(fetchUser).not.toHaveBeenCalled();
    expect(downloadExcel).not.toHaveBeenCalled();
    total.value = 3;
    isSearchPending.value = false;
    await vi.waitFor(() => expect(button).toHaveAccessibleName("Exporter la vue filtrée (3 applications) — fonctionnalité bêta"));
    expect(button).toHaveAttribute("aria-disabled", "false");
  });
});

describe("ApplicationSearchActions — accès bêta de l'export HTML", () => {
  it("affiche un badge accessible et revérifie les droits avant le téléchargement", async () => {
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    const button = screen.getByTestId("applications-export-html-btn");
    expect(button).toHaveTextContent("Bêta");
    expect(button).toHaveAccessibleName(/fonctionnalité bêta/);
    expect(button.querySelector(".fr-badge")?.tagName).toBe("SPAN");
    expect(button.querySelector(".fr-badge")).toHaveAttribute("aria-hidden", "true");
    await fireEvent.click(button);
    await flushPromises();
    expect(downloadHtml).toHaveBeenCalledExactlyOnceWith({ shortName: "app" });
    expect(fetchUser).toHaveBeenCalledTimes(1);
    expect(getConfig).toHaveBeenLastCalledWith({ refresh: true });
  });

  it.each([Permission.BETA_FEATURES, Permission.DATA_EXPORT])("bloque l'export si /users/me retire %s au clic", async (revoked) => {
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    fetchUser.mockImplementationOnce(async () => {
      grantedPermissions.value = grantedPermissions.value.filter((permission) => permission !== revoked);
      return true;
    });
    await fireEvent.click(screen.getByTestId("applications-export-html-btn"));
    await flushPromises();
    expect(downloadHtml).not.toHaveBeenCalled();
    if (revoked === Permission.DATA_EXPORT) {
      expect(screen.getByTestId("applications-export-html-btn")).toBeDisabled();
    } else {
      expect(screen.queryByTestId("applications-export-html-btn")).toBeNull();
    }
  });

  it("bloque un clic capturé après révocation réactive de Bêta", async () => {
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    const button = screen.getByTestId("applications-export-html-btn");
    grantedPermissions.value = [Permission.DATA_EXPORT];
    await fireEvent.click(button);
    expect(downloadHtml).not.toHaveBeenCalled();
    expect(screen.queryByTestId("applications-export-html-btn")).toBeNull();
  });

  it("permet la sortie de bêta de HTML indépendamment d'Excel", async () => {
    const config = reactive({ betaFeatures: Object.values(FeatureId) });
    getConfig.mockResolvedValue(config);
    await renderWith([Permission.DATA_EXPORT]);
    config.betaFeatures.splice(config.betaFeatures.indexOf(FeatureId.CATALOGUE_HTML_EXPORT), 1);
    await flushPromises();
    const button = screen.getByTestId("applications-export-html-btn");
    expect(button).not.toHaveTextContent("Bêta");
    expect(button).not.toHaveAccessibleName(/bêta/);
    expect(screen.queryByTestId("application-export-btn")).toBeNull();
    await fireEvent.click(button);
    await flushPromises();
    expect(downloadHtml).toHaveBeenCalledExactlyOnceWith({ shortName: "app" });
  });
});

describe("ApplicationSearchActions — actions sans autorisation", () => {
  it.each([
    { betaFeatures: [], permissions: [] },
    { betaFeatures: Object.values(FeatureId), permissions: [Permission.BETA_FEATURES] },
  ])("affiche les actions accessibles mais les désactive sans leurs droits ($permissions)", async ({ betaFeatures, permissions }) => {
    getConfig.mockResolvedValue({ betaFeatures });
    await renderWith(permissions);

    for (const testId of [
      "create-application-btn",
      "report-missing-app",
      "create-quality-campaign-btn",
      "application-export-btn",
      "application-export-btn-mobile",
      "application-export-view-btn",
      "applications-export-html-btn",
    ]) {
      const button = screen.getByTestId(testId);
      expect(button).toBeDisabled();
      await fireEvent.click(button);
    }
    expect(downloadExcel).not.toHaveBeenCalled();
    expect(downloadHtml).not.toHaveBeenCalled();
    expect(fetchUser).not.toHaveBeenCalled();

    grantedPermissions.value = [Permission.DATA_EXPORT, Permission.BETA_FEATURES];
    await flushPromises();
    expect(screen.getByTestId("application-export-btn")).toBeEnabled();
    expect(screen.getByTestId("applications-export-html-btn")).toBeEnabled();
  });
});
