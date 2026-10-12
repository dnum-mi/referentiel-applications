import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { within } from "@testing-library/vue";
import UserTokensTab from "./UserTokensTab.vue";

const { createToken } = vi.hoisted(() => ({ createToken: vi.fn() }));
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const writeText = vi.fn();
vi.mock("@/api", () => ({
  default: {
    tokenControllerFindPersonal: vi.fn().mockResolvedValue({ data: [] }),
    tokenControllerCreatePersonal: createToken,
  },
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ isAuthDowngraded: false }) }));
enableAutoUnmount(afterEach);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T14:00:00.000Z"));
  createToken.mockReset().mockResolvedValue({ error: "refus simulé" });
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
});
afterEach(() => {
  vi.useRealTimers();
  if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
  else Reflect.deleteProperty(navigator, "clipboard");
});

async function renderTokens() {
  const wrapper = mount(UserTokensTab, {
    attachTo: document.body,
    global: { stubs: { DsfrModal: { props: ["opened"], template: '<div v-if="opened"><slot /><slot name="footer" /></div>' } } },
  });
  await flushPromises();
  await wrapper.get('[data-testid="token-create-btn"]').trigger("click");
  return wrapper;
}

describe("Création de token — erreurs et date", () => {
  it("cible et décrit chaque champ refusé sans effacer les champs valides", async () => {
    const wrapper = await renderTokens();
    expect(wrapper.get("#token-name").element).toHaveFocus();
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    for (const field of ["name", "description", "expiresAt"]) {
      const input = wrapper.get(`#token-${field}`);
      expect(input.element).toHaveAttribute("aria-invalid", "true");
      expect(input.element).toHaveAttribute("aria-describedby", `token-${field}-error`);
      expect(wrapper.get(`#token-${field}-error`).text()).not.toBe("");
    }
    expect(wrapper.get("#token-name").element).toHaveFocus();
    await wrapper.get("#token-name").setValue("Service exemple");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.get("#token-description").element).toHaveFocus();
    expect(wrapper.get("#token-name").element).toHaveValue("Service exemple");
    expect(wrapper.get("#token-name").element).not.toHaveAttribute("aria-invalid");
    expect(createToken).not.toHaveBeenCalled();
  });

  it("accepte demain en date calendaire et rejette aujourd'hui avec une aide de correction", async () => {
    const wrapper = await renderTokens();
    await wrapper.get("#token-name").setValue("Service exemple");
    await wrapper.get("#token-description").setValue("Consultation du référentiel");
    const expiration = wrapper.get("#token-expiresAt");
    expect(expiration.element).toHaveAttribute("min", "2026-10-09");
    expect(expiration.element).toHaveAttribute("max", "2027-10-08");
    await expiration.setValue("2026-10-08");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(expiration.element).toHaveFocus();
    expect(expiration.element).toHaveAttribute("aria-invalid", "true");
    expect(createToken).not.toHaveBeenCalled();

    await expiration.setValue("2026-10-09");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(createToken).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ expiresAt: "2026-10-09" }) }));
    expect(expiration.element).not.toHaveAttribute("aria-invalid");
  });

  it.each(["succès", "refus"] as const)("annonce le %s de la copie même lorsque le token créé est encore affiché", async (result) => {
    createToken.mockResolvedValue({ data: { password: "EXAMPLE_TEST_TOKEN_ONLY" } });
    if (result === "refus") writeText.mockRejectedValue(new Error("Presse-papier indisponible"));
    const wrapper = await renderTokens();
    await wrapper.get("#token-name").setValue("Service exemple");
    await wrapper.get("#token-description").setValue("Consultation du référentiel");
    await wrapper.get("#token-expiresAt").setValue("2026-10-09");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    const copyButton = wrapper.get('button[aria-label="Copier le token"]');
    (copyButton.element as HTMLButtonElement).focus();
    await copyButton.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("EXAMPLE_TEST_TOKEN_ONLY");
    expect(copyButton.element).toHaveFocus();
    if (result === "succès") {
      expect(within(wrapper.get("div").element).getByRole("status")).toHaveTextContent("Token copié dans le presse-papier");
      expect(wrapper.get(".fr-valid-text").text()).toBe("Token copié dans le presse-papier");
    } else {
      expect(wrapper.get('[role="alert"]').text()).toContain(
        "Impossible de copier le token. Sélectionnez sa valeur pour le copier manuellement.",
      );
      expect(within(wrapper.get("div").element).getByRole("status")).toBeEmptyDOMElement();
    }
  });
});
