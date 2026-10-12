import { mount } from "@vue/test-utils";
import { useColumnPreferences } from "@/composables/use-column-preferences";
import ColumnCustomization from "./ColumnCustomization.vue";

vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ authenticated: true, hasPermissions: () => true }) }));

it("associe chaque largeur à un libellé et actualise la préférence partagée", async () => {
  useColumnPreferences().resetToDefaults();
  const wrapper = mount(ColumnCustomization, {
    global: { stubs: { DsfrModal: { template: '<div><slot /><slot name="footer" /></div>' } } },
  });
  await wrapper.get('[data-testid="customize-columns-button"]').trigger("click");
  const input = wrapper.get('input[id$="-label"]');
  expect(wrapper.get(`label[for="${input.attributes("id")}"]`).text()).toBe("Nom — largeur en pixels");
  expect(input.attributes("aria-describedby")).toBeTruthy();
  await input.setValue("475");
  expect(useColumnPreferences().tableColumns.value.find((column) => column.field === "label")?.width).toBe("475px");
  expect(wrapper.get('[role="status"]').text()).toContain("475 pixels");
  await wrapper.get('[data-testid="reset-columns-button"]').trigger("click");
  expect((input.element as HTMLInputElement).value).toBe("300");
  wrapper.unmount();
  useColumnPreferences().resetToDefaults();
});
