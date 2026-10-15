import { mount } from "@vue/test-utils";
import AppToaster from "./AppToaster.vue";

describe("AppToaster", () => {
  it("annonce les messages ajoutés à des régions permanentes et permet de les fermer", async () => {
    const wrapper = mount(AppToaster, { props: { messages: [] } });
    const status = wrapper.get('[role="status"]').element;
    const alert = wrapper.get('[role="alert"]').element;
    await wrapper.setProps({
      messages: [
        { id: "ok", description: "Fiche enregistrée", type: "success", timeout: 0, closeable: true },
        { id: "error", description: "Export indisponible", type: "error", timeout: 0, closeable: true },
      ],
    });
    expect(wrapper.get('[role="status"]').element).toBe(status);
    expect(wrapper.get('[role="alert"]').element).toBe(alert);
    expect(wrapper.get('[role="status"]').text()).toContain("Fiche enregistrée");
    expect(wrapper.get('[role="alert"]').text()).toContain("Export indisponible");
    await wrapper.get('[data-testid="app-toaster-message-error"] button').trigger("click");
    expect(wrapper.emitted("closeMessage")).toEqual([["error"]]);
    wrapper.unmount();
  });
});
