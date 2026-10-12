import { mount } from "@vue/test-utils";
import UserPermissionList from "./UserPermissionList.vue";

it("structure les permissions en liste sans modifier leurs libellés", () => {
  const wrapper = mount(UserPermissionList, { props: { label: "Permissions", permissions: ["CreateApplication", "TechnologyList"] } });
  const items = wrapper.findAll("ul.fr-tags-group > li");
  expect(items).toHaveLength(2);
  expect(items.every((item) => item.text().length > 0)).toBe(true);
  expect(wrapper.get("ul").element.children).toHaveLength(2);
  wrapper.unmount();
});

it("conserve l’état sans permission sans créer de liste vide", () => {
  const wrapper = mount(UserPermissionList, { props: { label: "Permissions", permissions: [] } });
  expect(wrapper.find("ul").exists()).toBe(false);
  expect(wrapper.text()).toContain("Aucune permission.");
  wrapper.unmount();
});
