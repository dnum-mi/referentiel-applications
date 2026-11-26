import { DsfrFooter, DsfrHeader } from "@gouvminint/vue-dsfr";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { useRgaaGlobalA11y } from "./use-rgaa-a11y";

enableAutoUnmount(afterEach);

function render() {
  return mount(
    defineComponent({
      components: { DsfrFooter, DsfrHeader },
      setup() {
        useRgaaGlobalA11y();
      },
      template: `
        <DsfrHeader service-title="Référentiel des Applications" :logo-text="['Ministère', 'de l\\'intérieur']" />
        <main><h1>Recherche d'applications</h1></main>
        <DsfrFooter :logo-text="['Ministère', 'de l’intérieur']" />
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

  it("sépare la devise du nom du ministère dans les deux blocs-marque", async () => {
    const wrapper = render();
    await nextTick();

    const logos = wrapper.findAll(".fr-logo");
    expect(logos).toHaveLength(2);
    for (const logo of logos) {
      expect(logo.get("[data-rgaa-devise]").element.textContent).toBe(" Liberté, égalité, fraternité");
      expect(logo.element.textContent).toMatch(/de l['’]intérieur Liberté, égalité, fraternité$/);
    }
  });

  it("conserve les coupures visuelles des logos sans leur donner de rôle sémantique", async () => {
    const wrapper = render();
    await nextTick();

    const lineBreaks = wrapper.findAll(".fr-logo br");
    expect(lineBreaks).toHaveLength(2);
    for (const lineBreak of lineBreaks) {
      expect(lineBreak.attributes("role")).toBe("presentation");
    }
  });
});
