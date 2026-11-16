import { DsfrFooterLink } from "@gouvminint/vue-dsfr";
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
