import { DsfrFooter, DsfrFooterLink } from "@gouvminint/vue-dsfr";
import { enableAutoUnmount, mount } from "@vue/test-utils";

enableAutoUnmount(afterEach);

it("transmet le titre du lien de pied de page et ses mises à jour", async () => {
  const wrapper = mount(DsfrFooterLink, {
    props: { label: "Contact Tchap", href: "https://www.tchap.gouv.fr/", title: "Contact Tchap - nouvelle fenêtre" },
  });

  expect(wrapper.get("a").attributes("title")).toBe("Contact Tchap - nouvelle fenêtre");
  await wrapper.setProps({ title: "Contacter l'équipe sur Tchap - nouvelle fenêtre" });
  expect(wrapper.get("a").attributes("title")).toBe("Contacter l'équipe sur Tchap - nouvelle fenêtre");
});

it("annonce la nouvelle fenêtre dans le contenu et suit les changements de cible", async () => {
  const wrapper = mount(DsfrFooterLink, {
    props: { label: "Contact Tchap", href: "https://www.tchap.gouv.fr/", target: "_blank" },
  });
  const link = wrapper.get("a");
  expect(link.get(".fr-sr-only").text()).toBe("- nouvelle fenêtre");
  expect(link.element).toHaveAccessibleName("Contact Tchap - nouvelle fenêtre");
  expect(link.attributes("aria-label")).toBeUndefined();
  expect(link.attributes("rel")).toBe("noopener noreferrer");

  await wrapper.setProps({ target: undefined });
  expect(link.find(".fr-sr-only").exists()).toBe(false);
  expect(link.element).toHaveAccessibleName("Contact Tchap");
});

it("rend l'annonce dans les liens de contenu et de licence sans écraser l'intitulé", async () => {
  const wrapper = mount(DsfrFooter, {
    props: {
      mandatoryLinks: [],
      ecosystemLinks: [{ label: "Code source", href: "https://github.com/", title: "Code source - nouvelle fenêtre" }],
    },
    global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
  });
  const content = wrapper.get(".fr-footer__content-link");
  const licence = wrapper.get(".fr-link-licence");
  expect(content.element).toHaveAccessibleName("Code source - nouvelle fenêtre");
  expect(licence.element).toHaveAccessibleName("licence etalab-2.0 - nouvelle fenêtre");
  expect(licence.attributes("title")).toBe("licence etalab-2.0 - nouvelle fenêtre");
  for (const link of [content, licence]) {
    expect(link.get(".fr-sr-only").text()).toBe("- nouvelle fenêtre");
    expect(link.attributes("target")).toBe("_blank");
  }

  await wrapper.setProps({
    ecosystemLinks: [{ label: "Documentation", href: "https://example.invalid/", title: "Documentation", target: "_self" }],
    licenceLinkProps: { href: "https://example.invalid/", target: "_self" },
  });
  expect(content.element).toHaveAccessibleName("Documentation");
  expect(content.find(".fr-sr-only").exists()).toBe(false);
  expect(licence.find(".fr-sr-only").exists()).toBe(false);
  expect(licence.attributes("title")).toBe("licence etalab-2.0");
});
