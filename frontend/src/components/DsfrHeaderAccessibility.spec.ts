import { DsfrHeader, DsfrTooltip } from "@gouvminint/vue-dsfr";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { defineComponent } from "vue";

enableAutoUnmount(afterEach);

function render() {
  return mount(
    defineComponent({
      components: { DsfrHeader, DsfrTooltip },
      template: `
        <DsfrHeader service-title="Référentiel">
          <template #mainnav><nav><a href="/">Accueil</a></nav></template>
        </DsfrHeader>
        <main>
          <label for="description">Description</label>
          <input id="description" />
          <DsfrTooltip aria-label="Aide" content="Une aide consultable." />
        </main>
      `,
    }),
    {
      attachTo: document.body,
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    },
  );
}

describe("Accessibilité du bandeau DSFR", () => {
  it("ne prend pas le focus sur Échap lorsque son menu est fermé", async () => {
    const wrapper = render();
    const field = wrapper.get<HTMLInputElement>("#description");
    field.element.focus();
    await field.trigger("keydown", { key: "Escape" });
    expect(field.element).toHaveFocus();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it("laisse l'aide se fermer avec Échap en conservant le focus sur sa commande", async () => {
    const wrapper = render();
    const help = wrapper.get<HTMLButtonElement>('[aria-label="Aide"]');
    help.element.focus();
    await help.trigger("click");
    expect(wrapper.get('[role="tooltip"]').classes()).toContain("fr-tooltip--shown");
    await help.trigger("keydown", { key: "Escape" });
    expect(wrapper.get('[role="tooltip"]').classes()).not.toContain("fr-tooltip--shown");
    expect(help.element).toHaveFocus();
  });
});
