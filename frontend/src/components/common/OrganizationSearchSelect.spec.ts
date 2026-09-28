import { mount } from "@vue/test-utils";
import OrganizationSearchSelect from "./OrganizationSearchSelect.vue";

const { find, organization } = vi.hoisted(() => ({
  find: vi.fn(),
  organization: { id: "org-1", path: "Direction / Service" },
}));
vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: () => ({ find, organizations: { [organization.id]: organization } }),
}));

function renderSearch() {
  return mount(OrganizationSearchSelect, {
    shallow: true,
    global: {
      stubs: {
        DsfrInputGroup: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
        },
        DsfrSelect: {
          props: ["modelValue", "options"],
          emits: ["update:modelValue"],
          template:
            '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.text }}</option></select>',
        },
      },
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  find.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("OrganizationSearchSelect", () => {
  it("relie la même erreur à la recherche et au select, et expose le focus du select", async () => {
    const wrapper = mount(OrganizationSearchSelect, {
      attachTo: document.body,
      props: {
        label: "Organisation MOA *",
        required: true,
        errorMessage: "L'organisation est obligatoire.",
        inputId: "moa-organization-search",
        selectId: "moa-organization-select",
        descriptionId: "moa-organization-error",
      },
    });
    const search = wrapper.get("#moa-organization-search");
    const select = wrapper.get("#moa-organization-select");
    expect(wrapper.get("#moa-organization-error").text()).toBe("L'organisation est obligatoire.");
    for (const field of [search, select]) {
      expect(field.element).toHaveAttribute("aria-describedby", "moa-organization-error");
      expect(field.element).toHaveAttribute("aria-invalid", "true");
      expect(document.getElementById(field.attributes("aria-describedby")!)).toHaveTextContent("L'organisation est obligatoire.");
    }
    expect(select.element).toHaveAttribute("aria-required", "true");
    wrapper.vm.focus();
    expect(select.element).toHaveFocus();

    await wrapper.setProps({ errorMessage: "" });
    for (const field of [search, select]) {
      expect(field.element).not.toHaveAttribute("aria-describedby");
      expect(field.element).not.toHaveAttribute("aria-invalid");
    }
    expect(wrapper.find("#moa-organization-error").exists()).toBe(false);
    wrapper.vm.focus();
    expect(select.element).toHaveFocus();
    wrapper.unmount();
  });

  it("cible la recherche quand le select est temporairement désactivé", async () => {
    let finish!: (value: (typeof organization)[]) => void;
    find.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const wrapper = mount(OrganizationSearchSelect, { attachTo: document.body });
    await wrapper.get("input").setValue("Direction");
    await vi.advanceTimersByTimeAsync(300);
    expect(wrapper.get("select").element).toBeDisabled();
    wrapper.vm.focus();
    expect(wrapper.get("input").element).toHaveFocus();
    finish([]);
    await vi.advanceTimersByTimeAsync(0);
    wrapper.unmount();
  });

  it("conserve l'organisation sélectionnée pendant la recherche suivante", async () => {
    find.mockResolvedValue([organization]);
    const wrapper = renderSearch();
    await wrapper.get("input").setValue("Direction");
    await vi.advanceTimersByTimeAsync(300);
    await wrapper.get("select").setValue(organization.id);
    expect(wrapper.emitted("update:modelValue")).toEqual([[organization.id]]);
    expect(wrapper.get("select").element.value).toBe(organization.id);

    await wrapper.get("input").setValue("autre");
    expect(wrapper.get("select").element.value).toBe(organization.id);
    expect(wrapper.get(`option[value="${organization.id}"]`).text()).toBe(organization.path);
    wrapper.unmount();
  });

  it("ignore une réponse qui arrive après que la saisie est repassée sous le seuil", async () => {
    let resolve!: (value: (typeof organization)[]) => void;
    find.mockImplementation(
      () =>
        new Promise((res) => {
          resolve = res;
        }),
    );
    const wrapper = renderSearch();
    await wrapper.get("input").setValue("Direction");
    await vi.advanceTimersByTimeAsync(300);
    await wrapper.get("input").setValue("Di");
    resolve([organization]);
    await vi.advanceTimersByTimeAsync(300);

    expect(wrapper.find(`option[value="${organization.id}"]`).exists()).toBe(false);
    expect(find).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
