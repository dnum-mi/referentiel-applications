import { flushPromises, mount } from "@vue/test-utils";
import ApplicationProductExport from "./ApplicationProductExport.vue";

const { downloadProductPowerpoint, downloadProductHtml, addErrorMessage } = vi.hoisted(() => ({
  downloadProductPowerpoint: vi.fn(),
  downloadProductHtml: vi.fn(),
  addErrorMessage: vi.fn(),
}));

vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({ downloadProductPowerpoint, downloadProductHtml }),
}));
vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addErrorMessage }),
}));

function render() {
  return mount(ApplicationProductExport, {
    props: { applicationId: "app-1" },
    global: {
      stubs: { DsfrButton: { template: "<button><slot /></button>" } },
    },
  });
}

describe("Export de fiche produit PowerPoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("signale l'indisponibilité sans retirer le bouton du parcours clavier pendant la préparation", async () => {
    let finish!: () => void;
    downloadProductPowerpoint.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const wrapper = render();
    await wrapper.get('[data-testid="application-export-powerpoint-btn"]').trigger("click");
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
    const wrapper = render();
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
    const wrapper = render();
    await wrapper.get('[data-testid="application-export-html-btn"]').trigger("click");
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
});
