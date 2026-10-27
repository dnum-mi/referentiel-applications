import { enableAutoUnmount, mount } from "@vue/test-utils";
import OgaLink from "./OgaLink.vue";

const { organization } = vi.hoisted(() => ({ organization: { path: "Ministère / Direction", url: "https://example.test" } }));
vi.mock("@/stores/organizationStore", () => ({ useOrganizationStore: () => ({ organizations: { "org-1": organization } }) }));
enableAutoUnmount(afterEach);

it("annonce et sécurise la nouvelle fenêtre du lien d'organisation (#3027)", () => {
  const link = mount(OgaLink, { props: { organizationId: "org-1" } }).get("a");
  expect(link.element).toHaveAccessibleName("Ministère / Direction - nouvelle fenêtre");
  expect(link.attributes("title")).toBe("Ministère / Direction - nouvelle fenêtre");
  expect(link.attributes("href")).toBe(organization.url);
  expect(link.attributes("target")).toBe("_blank");
  expect(link.attributes("rel")).toBe("noopener noreferrer");
});

it("garde un texte simple pour une organisation sans URL", () => {
  const url = organization.url;
  organization.url = "";
  try {
    const wrapper = mount(OgaLink, { props: { organizationId: "org-1" } });
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.text()).toBe(organization.path);
  } finally {
    organization.url = url;
  }
});
