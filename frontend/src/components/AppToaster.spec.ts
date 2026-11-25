import { mount } from "@vue/test-utils";
import AppToaster from "./AppToaster.vue";

describe("AppToaster", () => {
  it.each([undefined, "", "   \n "])("ne génère pas de titre vide pour un titre %j", (title) => {
    const wrapper = mount(AppToaster, {
      props: {
        messages: [
          { id: "ok", title, description: "Fiche enregistrée", type: "success", timeout: 0, closeable: true },
          { id: "error", title, description: "Export indisponible", type: "error", timeout: 0, closeable: true },
        ],
      },
    });

    expect(wrapper.find("h1, h2, h3, h4, h5, h6").exists()).toBe(false);
    expect(wrapper.findAll(".fr-alert--sm")).toHaveLength(2);
    expect(wrapper.get('[role="status"]').text()).toContain("Fiche enregistrée");
    expect(wrapper.get('[role="alert"]').text()).toContain("Export indisponible");
    for (const button of wrapper.findAll("button")) {
      const descriptionId = button.attributes("aria-describedby");
      expect(wrapper.get(`[id="${descriptionId}"]`).text()).not.toBe("");
    }
    wrapper.unmount();
  });

  it("conserve un titre explicite et son niveau sans utiliser le format compact", () => {
    const wrapper = mount(AppToaster, {
      props: {
        messages: [
          {
            id: "titled",
            title: "  Application enregistrée  ",
            titleTag: "h2",
            description: "La fiche est disponible.",
            type: "success",
            timeout: 0,
            closeable: true,
          },
        ],
      },
    });

    expect(wrapper.get("h2.fr-alert__title").text()).toBe("Application enregistrée");
    expect(wrapper.find(".fr-alert--sm").exists()).toBe(false);
    expect(wrapper.text()).toContain("La fiche est disponible.");
    const describedBy = wrapper.get("button").attributes("aria-describedby");
    expect(describedBy).toBeTruthy();
    const descriptionIds = (describedBy ?? "").split(" ");
    expect(descriptionIds.map((id) => wrapper.get(`[id="${id}"]`).text())).toEqual(["Application enregistrée", "La fiche est disponible."]);
    wrapper.unmount();
  });

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
