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
