import { mount } from "@vue/test-utils";
import PermissionWritePriorityRestart from "./PermissionWritePriorityRestart.vue";

it("nomme le droit et le type d’acteur et expose son état et sa bascule", async () => {
  const wrapper = mount(PermissionWritePriorityRestart, {
    props: { id: "MOA-priority", checked: true, actorTypeLabel: "Maîtrise d’ouvrage" },
  });
  const button = wrapper.get("button");
  expect(button.attributes("id")).toBe("MOA-priority");
  expect(button.attributes("aria-label")).toContain("RW — Écriture de la priorisation et du redémarrage pour Maîtrise d’ouvrage");
  expect(button.attributes("aria-pressed")).toBe("true");
  await button.trigger("click");
  expect(wrapper.emitted("update:model-value")).toEqual([[false]]);
  await wrapper.setProps({ checked: false });
  expect(button.attributes("aria-pressed")).toBe("false");
  expect(button.attributes("aria-label")).toContain("- — Écriture");
  wrapper.unmount();
});
