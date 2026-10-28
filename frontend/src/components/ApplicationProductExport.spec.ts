import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { reactive, ref } from "vue";
import { FeatureId, Permission } from "@/client";
import ApplicationProductExport from "./ApplicationProductExport.vue";

const { downloadProductPowerpoint, downloadProductHtml, addErrorMessage, getConfig, hasPermissions, fetchUser } = vi.hoisted(() => ({
  downloadProductPowerpoint: vi.fn(),
  downloadProductHtml: vi.fn(),
  addErrorMessage: vi.fn(),
  getConfig: vi.fn(),
  hasPermissions: vi.fn(),
  fetchUser: vi.fn(),
}));

vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({ downloadProductPowerpoint, downloadProductHtml }),
}));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage }),
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions, fetchUser }) }));
vi.mock("@/services/config", () => ({ getConfig }));
const permissions = ref<Permission[]>([]);
enableAutoUnmount(afterEach);

async function render() {
  const wrapper = mount(ApplicationProductExport, {
    props: { applicationId: "app-1" },
    global: {
      stubs: { DsfrButton: { template: "<button><slot /></button>" } },
    },
  });
  await flushPromises();
  return wrapper;
}

describe("Export de fiche produit PowerPoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    permissions.value = [Permission.BETA_FEATURES, Permission.APP_READ];
    hasPermissions.mockImplementation((required: Permission[]) => required.some((permission) => permissions.value.includes(permission)));
    fetchUser.mockResolvedValue(true);
    getConfig.mockResolvedValue({ betaFeatures: Object.values(FeatureId) });
  });

  it("signale l'indisponibilité sans retirer le bouton du parcours clavier pendant la préparation", async () => {
    let finish!: () => void;
    downloadProductPowerpoint.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const wrapper = await render();
    await wrapper.get('[data-testid="application-export-powerpoint-btn"]').trigger("click");
    await flushPromises();
    expect(downloadProductPowerpoint).toHaveBeenCalledWith("app-1");
    expect(wrapper.get('[data-testid="application-export-powerpoint-btn"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get('[data-testid="application-export-powerpoint-btn"]').attributes("aria-disabled")).toBe("true");
    expect(wrapper.get('[data-testid="application-export-powerpoint-btn"]').attributes("aria-busy")).toBe("true");
    expect(wrapper.text()).toContain("Préparation du PowerPoint");
    finish();
    await flushPromises();
    expect(wrapper.get('[data-testid="application-export-powerpoint-btn"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get('[data-testid="application-export-powerpoint-btn"]').attributes("aria-disabled")).toBe("false");
    expect(wrapper.get('[data-testid="application-export-powerpoint-btn"]').attributes("aria-busy")).toBe("false");
    expect(addErrorMessage).not.toHaveBeenCalled();
  });

  it("présente l'échec et permet de réessayer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    downloadProductPowerpoint.mockRejectedValueOnce(new Error("Échec serveur"));
    const wrapper = await render();
    await wrapper.get('[data-testid="application-export-powerpoint-btn"]').trigger("click");
    await flushPromises();
    expect(addErrorMessage).toHaveBeenCalledWith("Impossible d'exporter la fiche produit en PowerPoint. Veuillez réessayer.");
    expect(wrapper.get('[data-testid="application-export-powerpoint-btn"]').attributes("disabled")).toBeUndefined();
    downloadProductPowerpoint.mockResolvedValueOnce(undefined);
    await wrapper.get('[data-testid="application-export-powerpoint-btn"]').trigger("click");
    await flushPromises();
    expect(downloadProductPowerpoint).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });

  it("propose la même fiche en HTML et bloque les exports concurrents", async () => {
    let finish!: () => void;
    downloadProductHtml.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const wrapper = await render();
    await wrapper.get('[data-testid="application-export-html-btn"]').trigger("click");
    await flushPromises();
    expect(downloadProductHtml).toHaveBeenCalledWith("app-1");
    expect(downloadProductPowerpoint).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="application-export-powerpoint-btn"]').attributes("aria-disabled")).toBe("true");
    expect(wrapper.get("output").text()).toContain("Préparation de la fiche HTML");
    await wrapper.get('[data-testid="application-export-html-btn"]').trigger("click");
    await wrapper.get('[data-testid="application-export-powerpoint-btn"]').trigger("click");
    expect(downloadProductHtml).toHaveBeenCalledTimes(1);
    expect(downloadProductPowerpoint).not.toHaveBeenCalled();
    finish();
    await flushPromises();
    expect(wrapper.get('[data-testid="application-export-html-btn"]').attributes("disabled")).toBeUndefined();
    wrapper.unmount();
  });

  it("masque les deux exports sans la capacité bêta et les badges sont lisibles dans leurs noms", async () => {
    permissions.value = [Permission.APP_READ];
    const denied = await render();
    expect(denied.find("button").exists()).toBe(false);
    denied.unmount();
    permissions.value.push(Permission.BETA_FEATURES);
    const wrapper = await render();
    expect(wrapper.get('[data-testid="application-export-html-btn"]').element).toHaveAccessibleName(/HTML.*Bêta/);
    expect(wrapper.get('[data-testid="application-export-powerpoint-btn"]').element).toHaveAccessibleName(/PowerPoint.*Bêta/);
    expect(wrapper.get('[data-testid="application-export-html-btn"] .fr-badge').element.tagName).toBe("SPAN");
    expect(wrapper.get('[data-testid="application-export-powerpoint-btn"] .fr-badge').element.tagName).toBe("SPAN");
    wrapper.unmount();
  });

  it("arrête les callbacks après révocation et revalide les droits métier avant l'export", async () => {
    const wrapper = await render();
    const button = wrapper.get('[data-testid="application-export-html-btn"]');
    permissions.value = [Permission.APP_READ];
    await button.trigger("click");
    expect(downloadProductHtml).not.toHaveBeenCalled();
    expect(wrapper.find("button").exists()).toBe(false);
    permissions.value = [Permission.BETA_FEATURES];
    await flushPromises();
    await wrapper.get('[data-testid="application-export-html-btn"]').trigger("click");
    await flushPromises();
    expect(downloadProductHtml).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("retire restriction et badge uniquement du format sorti de bêta", async () => {
    const config = reactive({ betaFeatures: Object.values(FeatureId) });
    getConfig.mockResolvedValue(config);
    permissions.value = [Permission.APP_READ];
    const wrapper = await render();
    config.betaFeatures.splice(config.betaFeatures.indexOf(FeatureId.PRODUCT_HTML_EXPORT), 1);
    await flushPromises();
    expect(wrapper.find('[data-testid="application-export-powerpoint-btn"]').exists()).toBe(false);
    const htmlButton = wrapper.get('[data-testid="application-export-html-btn"]');
    expect(htmlButton.text()).not.toContain("Bêta");
    await htmlButton.trigger("click");
    await flushPromises();
    expect(downloadProductHtml).toHaveBeenCalledExactlyOnceWith("app-1");
    wrapper.unmount();
  });

  it("rafraîchit les droits après un refus d'export et retire les commandes révoquées", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    downloadProductHtml.mockRejectedValueOnce(new Error("403 Forbidden"));
    fetchUser.mockResolvedValueOnce(true).mockImplementationOnce(async () => {
      permissions.value = [Permission.APP_READ];
      return true;
    });
    const wrapper = await render();
    await wrapper.get('[data-testid="application-export-html-btn"]').trigger("click");
    await flushPromises();
    expect(downloadProductHtml).toHaveBeenCalledExactlyOnceWith("app-1");
    expect(fetchUser).toHaveBeenCalledTimes(2);
    expect(wrapper.find("button").exists()).toBe(false);
    expect(addErrorMessage).toHaveBeenCalledOnce();
    errorLog.mockRestore();
  });

  it.each(["html", "powerpoint"])("la sortie de bêta d'Excel conserve la restriction et la révocation de la fiche %s", async (format) => {
    getConfig.mockResolvedValue({
      betaFeatures: Object.values(FeatureId).filter((feature) => feature !== FeatureId.CATALOGUE_EXCEL_EXPORT),
    });
    permissions.value = [Permission.APP_READ];
    const wrapper = await render();
    expect(wrapper.find("button").exists()).toBe(false);
    permissions.value.push(Permission.BETA_FEATURES);
    await flushPromises();
    const button = wrapper.get(`[data-testid="application-export-${format}-btn"]`);
    expect(button.text()).toContain("Bêta");
    expect(button.element).toHaveAccessibleName(/Bêta/);
    fetchUser.mockImplementationOnce(async () => {
      permissions.value = [Permission.APP_READ];
      return true;
    });
    await button.trigger("click");
    await flushPromises();
    expect(downloadProductHtml).not.toHaveBeenCalled();
    expect(downloadProductPowerpoint).not.toHaveBeenCalled();
    expect(wrapper.find("button").exists()).toBe(false);
  });
});
