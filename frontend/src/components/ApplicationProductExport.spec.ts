import { flushPromises, mount } from "@vue/test-utils";
import ApplicationProductExport from "./ApplicationProductExport.vue";

const { downloadProductPowerpoint, addErrorMessage } = vi.hoisted(() => ({
  downloadProductPowerpoint: vi.fn(),
  addErrorMessage: vi.fn(),
}));

vi.mock("@/stores/applicationStore", () => ({
  useApplicationStore: () => ({ downloadProductPowerpoint }),
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

  it("désactive le bouton pendant la préparation et le réactive après le téléchargement", async () => {
    let finish!: () => void;
    downloadProductPowerpoint.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    const wrapper = render();
    await wrapper.get("button").trigger("click");
    expect(downloadProductPowerpoint).toHaveBeenCalledWith("app-1");
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
    expect(wrapper.get("button").attributes("aria-busy")).toBe("true");
    expect(wrapper.text()).toContain("Préparation du PowerPoint");
    finish();
    await flushPromises();
    expect(wrapper.get("button").attributes("disabled")).toBeUndefined();
    expect(wrapper.get("button").attributes("aria-busy")).toBe("false");
    expect(addErrorMessage).not.toHaveBeenCalled();
  });

  it("présente l'échec et permet de réessayer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    downloadProductPowerpoint.mockRejectedValueOnce(new Error("Échec serveur"));
    const wrapper = render();
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(addErrorMessage).toHaveBeenCalledWith("Impossible d'exporter la fiche produit en PowerPoint. Veuillez réessayer.");
    expect(wrapper.get("button").attributes("disabled")).toBeUndefined();
    downloadProductPowerpoint.mockResolvedValueOnce(undefined);
    await wrapper.get("button").trigger("click");
    await flushPromises();
    expect(downloadProductPowerpoint).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });
});
