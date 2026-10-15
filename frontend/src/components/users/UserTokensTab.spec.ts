import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { within } from "@testing-library/vue";
import UserTokensTab from "./UserTokensTab.vue";

const { createToken, findTokens, revokeToken } = vi.hoisted(() => ({ createToken: vi.fn(), findTokens: vi.fn(), revokeToken: vi.fn() }));
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const writeText = vi.fn();
vi.mock("@/api", () => ({
  default: {
    tokenControllerFindPersonal: findTokens,
    tokenControllerCreatePersonal: createToken,
    tokenControllerDeletePersonal: revokeToken,
  },
}));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ isAuthDowngraded: false }) }));
enableAutoUnmount(afterEach);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T14:00:00.000Z"));
  createToken.mockReset().mockResolvedValue({ error: "refus simulé" });
  findTokens.mockReset().mockResolvedValue({ data: [] });
  revokeToken.mockReset();
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
  it.each(["succès", "refus"] as const)(
    "préserve un autre contrôle rejoint pendant la création (%s) et bloque le doublon",
    async (outcome) => {
      let finish = () => {};
      createToken.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = () => resolve(outcome === "succès" ? { data: { password: "EXAMPLE_TEST_TOKEN_ONLY" } } : { error: "refus simulé" });
          }),
      );
      const wrapper = await renderTokens();
      await wrapper.get("#token-name").setValue("Service exemple");
      await wrapper.get("#token-description").setValue("Consultation du référentiel");
      await wrapper.get("#token-expiresAt").setValue("2026-10-09");
      const submit = wrapper.get<HTMLButtonElement>('button[type="submit"]');
      submit.element.focus();
      await wrapper.get("form").trigger("submit");
      expect(submit.element).toHaveAttribute("aria-disabled", "true");
      expect(submit.element).not.toBeDisabled();
      await wrapper.get("form").trigger("submit");
      expect(createToken).toHaveBeenCalledTimes(1);
      const other = document.createElement("button");
      document.body.append(other);
      other.focus();
      finish();
      await flushPromises();
      expect(other).toHaveFocus();
      expect(outcome === "succès" ? wrapper.get("code").text() : wrapper.get<HTMLInputElement>("#token-name").element.value).toBe(
        outcome === "succès" ? "EXAMPLE_TEST_TOKEN_ONLY" : "Service exemple",
      );
      other.remove();
    },
  );

  it("préserve le déplacement du focus et bloque une seconde révocation différée", async () => {
    findTokens.mockResolvedValue({ data: [{ id: "personal-1", kind: "personal", name: "Service exemple", status: "active" }] });
    let finish = () => {};
    revokeToken.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ error: "refus simulé" });
        }),
    );
    const wrapper = await renderTokens();
    await wrapper.get('button[aria-label="Révoquer le token Service exemple"]').trigger("click");
    const confirm = wrapper.findAll("button").find((button) => button.text() === "Révoquer" && !button.attributes("aria-label"));
    expect(confirm).toBeDefined();
    (confirm!.element as HTMLButtonElement).focus();
    await confirm!.trigger("click");
    await confirm!.trigger("click");
    expect(revokeToken).toHaveBeenCalledTimes(1);
    const name = wrapper.get<HTMLInputElement>("#token-name");
    name.element.focus();
    finish();
    await flushPromises();
    expect(name.element).toHaveFocus();
    expect(wrapper.get('[role="alert"]').text()).toContain("Erreur lors de la révocation du token");
  });
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
