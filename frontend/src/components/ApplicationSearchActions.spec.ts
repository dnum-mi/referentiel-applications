import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { flushPromises } from "@vue/test-utils";
import { reactive, ref } from "vue";
import { FeatureId, Permission } from "@/client";
import ApplicationSearchActions from "./ApplicationSearchActions.vue";

afterEach(() => cleanup());

const { hasPermissions, fetchUser, getConfig, user, downloadExcel, downloadHtml, addErrorMessage } = vi.hoisted(() => ({
  user: { gristDocIds: ["doc1"] as string[], gristUrl: "https://grist.example" as string | null, hasGristApiKey: true },
  hasPermissions: vi.fn(),
  fetchUser: vi.fn(),
  getConfig: vi.fn(),
  downloadExcel: vi.fn(),
  downloadHtml: vi.fn(),
  addErrorMessage: vi.fn(),
}));

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions, fetchUser, user }) }));
vi.mock("@/services/config", () => ({ getConfig }));
vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({ downloadExcel, downloadHtml }),
}));
vi.mock("@/composables/use-application-search", async () => {
  const { ref } = await import("vue");
  return { useApplicationSearch: () => ({ filters: ref({ shortName: "app" }) }) };
});

const grantedPermissions = ref<Permission[]>([]);

async function renderWith(permissions: Permission[]) {
  grantedPermissions.value = permissions;
  hasPermissions.mockImplementation((required: Permission[]) => required.some((p) => grantedPermissions.value.includes(p)));
  const rendered = render(ApplicationSearchActions, {
    global: {
      stubs: {
        ReportModal: true,
        CreateQualityCampaignModal: true,
        ColumnCustomization: true,
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
});

describe("ApplicationSearchActions — synchronisation Grist", () => {
  it("masque le bouton sans la capacité GristSync", async () => {
    await renderWith([Permission.DATA_EXPORT]);
    expect(screen.queryByTestId("grist-sync-btn")).toBeNull();
    expect(screen.queryByTestId("grist-sync-btn-mobile")).toBeNull();
  });

  it.each([
    ["sans document", { gristDocIds: [] }],
    ["sans URL", { gristUrl: null }],
    ["sans clé d'API", { hasGristApiKey: false }],
  ])("désactive le bouton tant que le profil est %s", async (_, missing) => {
    Object.assign(user, missing);
    await renderWith([Permission.GRIST_SYNC]);

    const button = screen.getByTestId("grist-sync-btn");
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleName(/^Synchroniser avec Grist/);
    expect(screen.getByTestId("grist-sync-btn-mobile")).toHaveAccessibleName(/^Synchroniser avec Grist/);
    expect(button).toHaveAttribute(
      "title",
      "Renseignez votre connexion et vos documents Grist dans l'onglet « Synchronisation Grist » de votre profil pour synchroniser",
    );
  });

  it("ouvre la modale de synchronisation", async () => {
    await renderWith([Permission.GRIST_SYNC]);
    expect(screen.getByTestId("grist-sync-modal")).toHaveAttribute("opened", "false");

    await fireEvent.click(screen.getByTestId("grist-sync-btn"));

    expect(screen.getByTestId("grist-sync-modal")).toHaveAttribute("opened", "true");
  });

  it.each(["grist-sync-btn", "grist-sync-btn-mobile"])("rend le focus au bouton %s après annulation", async (testId) => {
    await renderWith([Permission.GRIST_SYNC]);
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
    await renderWith([Permission.DATA_EXPORT, Permission.GRIST_SYNC, Permission.BETA_FEATURES]);
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
    await vi.waitFor(() => expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ shortName: "app" }));
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
  it.each([{ permissions: [] }, { permissions: [Permission.DATA_EXPORT] }, { permissions: [Permission.BETA_FEATURES] }])(
    "masque Excel sans les deux capacités ($permissions)",
    async ({ permissions }) => {
      await renderWith(permissions);
      expect(screen.queryByTestId("application-export-btn")).toBeNull();
      expect(screen.queryByTestId("application-export-btn-mobile")).toBeNull();
      expect(screen.queryByTestId("applications-export-html-btn")).toBeNull();
    },
  );

  it("indique Bêta sur ordinateur et mobile et revérifie les droits avant téléchargement", async () => {
    await renderWith([Permission.DATA_EXPORT, Permission.BETA_FEATURES]);
    for (const testId of ["application-export-btn", "application-export-btn-mobile"]) {
      const button = screen.getByTestId(testId);
      expect(button).toHaveTextContent("Bêta");
      expect(button).toHaveAccessibleName(/fonctionnalité bêta/);
      expect(button.querySelector(".fr-badge")?.tagName).toBe("SPAN");
      expect(button.querySelector(".fr-badge")).toHaveAttribute("aria-hidden", "true");
    }
    await fireEvent.click(screen.getByTestId("application-export-btn-mobile"));
    await vi.waitFor(() => expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ shortName: "app" }));
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
      expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ shortName: "app" });
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
      expect(screen.queryByTestId("application-export-btn")).toBeNull();
      expect(screen.queryByTestId("application-export-btn-mobile")).toBeNull();
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
    await vi.waitFor(() => expect(downloadExcel).toHaveBeenCalledExactlyOnceWith({ shortName: "app" }));
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
    expect(screen.queryByTestId("applications-export-html-btn")).toBeNull();
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
