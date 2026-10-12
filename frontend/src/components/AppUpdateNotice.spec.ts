import { flushPromises, mount } from "@vue/test-utils";
import AppUpdateNotice from "./AppUpdateNotice.vue";

describe("AppUpdateNotice", () => {
  it("n'active la nouvelle version qu'après une demande explicite", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(AppUpdateNotice, { props: { available: false, update } });
    expect(wrapper.find("section").exists()).toBe(false);
    await wrapper.setProps({ available: true });
    expect(wrapper.get('[role="status"]').text()).toContain("Enregistrez vos modifications");
    expect(update).not.toHaveBeenCalled();
    await wrapper.findAll("button")[0].trigger("click");
    await flushPromises();
    expect(update).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("permet de reporter la mise à jour et rappelle une version ultérieure", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(AppUpdateNotice, { props: { available: true, update } });
    await wrapper.findAll("button")[1].trigger("click");
    expect(wrapper.find("section").exists()).toBe(false);
    expect(update).not.toHaveBeenCalled();
    await wrapper.setProps({ available: false });
    await wrapper.setProps({ available: true });
    expect(wrapper.find("section").exists()).toBe(true);
    wrapper.unmount();
  });

  it("conserve le choix de réessayer lorsque l'activation échoue", async () => {
    const update = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
    const wrapper = mount(AppUpdateNotice, { props: { available: true, update } });
    await wrapper.findAll("button")[0].trigger("click");
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toContain("La mise à jour a échoué");
    expect(wrapper.findAll("button")[0].attributes("disabled")).toBeUndefined();
    await wrapper.findAll("button")[0].trigger("click");
    await flushPromises();
    expect(update).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });
});
