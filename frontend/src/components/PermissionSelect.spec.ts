import { mount } from "@vue/test-utils";
import PermissionSelect from "./PermissionSelect.vue";

describe("PermissionSelect", () => {
  it("resynchronise l'affichage quand read/write changent sur la même instance", async () => {
    const wrapper = mount(PermissionSelect, {
      props: { id: "permission", read: false, write: false },
    });
    const button = wrapper.get("button");
    const element = button.element;
    expect(button.text()).toBe("-");

    await wrapper.setProps({ read: true });
    expect(button.text()).toBe("RO");
    expect(button.attributes("data-state")).toBe("Read");

    await wrapper.setProps({ write: true });
    expect(wrapper.get("button").element).toBe(element);
    expect(button.text()).toBe("RW");
    expect(button.attributes("title")).toBe("Sélection actuelle : Lecture et écriture (RW), après activation : Aucun droit (-)");

    await wrapper.setProps({ read: false, write: false });
    expect(button.text()).toBe("-");
    expect(button.attributes("data-state")).toBe("none");
    expect(wrapper.emitted("update:model-value")).toBeUndefined();
    wrapper.unmount();
  });

  it("conserve les clics optimistes puis reprend le cycle depuis les permissions reçues", async () => {
    const wrapper = mount(PermissionSelect, {
      props: { id: "permission", read: false, write: false },
    });
    const button = wrapper.get("button");

    for (const state of ["Read", "Write", "none"]) {
      await button.trigger("click");
      expect(button.attributes("data-state")).toBe(state);
    }
    expect(wrapper.emitted("update:model-value")).toEqual([["Read"], ["Write"], ["none"]]);

    await wrapper.setProps({ read: true, write: true });
    expect(button.text()).toBe("RW");
    await button.trigger("click");
    expect(button.text()).toBe("-");
    expect(wrapper.emitted("update:model-value")).toEqual([["Read"], ["Write"], ["none"], ["none"]]);
    wrapper.unmount();
  });

  it("respecte la lecture minimale quand aucune permission n'est reçue", async () => {
    const wrapper = mount(PermissionSelect, {
      props: { id: "permission", read: false, write: false, permOrder: ["Read", "Write"] },
    });
    const button = wrapper.get("button");
    expect(button.text()).toBe("RO");

    await wrapper.setProps({ write: true });
    expect(button.text()).toBe("RW");
    await button.trigger("click");
    expect(button.text()).toBe("RO");
    expect(wrapper.emitted("update:model-value")).toEqual([["Read"]]);

    await wrapper.setProps({ write: false });
    expect(button.text()).toBe("RO");
    wrapper.unmount();
  });

  it("ne propose pas d'écriture dans un ordre limité à la lecture", async () => {
    const wrapper = mount(PermissionSelect, {
      props: { id: "permission", read: false, permOrder: ["none", "Read"] },
    });
    const button = wrapper.get("button");

    await wrapper.setProps({ read: true });
    expect(button.text()).toBe("RO");
    await button.trigger("click");
    expect(button.text()).toBe("-");
    await button.trigger("click");
    expect(button.text()).toBe("RO");
    expect(wrapper.emitted("update:model-value")).toEqual([["none"], ["Read"]]);
    wrapper.unmount();
  });
});
