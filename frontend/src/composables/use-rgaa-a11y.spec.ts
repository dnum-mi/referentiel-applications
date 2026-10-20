import { DsfrHeader } from "@gouvminint/vue-dsfr";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { useRgaaGlobalA11y } from "./use-rgaa-a11y";

enableAutoUnmount(afterEach);

function render() {
  return mount(
    defineComponent({
      components: { DsfrHeader },
      setup() {
        useRgaaGlobalA11y();
      },
      template: `
        <DsfrHeader service-title="Référentiel des Applications" :logo-text="['Ministère', 'de l\\'intérieur']" />
        <main><h1>Recherche d'applications</h1></main>
      `,
    }),
    {
      attachTo: document.body,
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    },
  );
}

describe("useRgaaGlobalA11y", () => {
  it("ne fait pas du titre de service un titre de niveau 1 (RGAA 9.1)", async () => {
    const wrapper = render();
    await nextTick();
    await flushPromises();

    const serviceTitle = wrapper.get(".fr-header__service-title");
    expect(serviceTitle.attributes("role")).toBeUndefined();
    expect(serviceTitle.attributes("aria-level")).toBeUndefined();
    expect(document.querySelectorAll('h1, [role="heading"][aria-level="1"]')).toHaveLength(1);
  });

  it("restitue la devise du logo aux lecteurs d'écran", async () => {
    const wrapper = render();
    await nextTick();

    expect(wrapper.get(".fr-logo [data-rgaa-devise]").text()).toBe("Liberté, égalité, fraternité");
  });
});
