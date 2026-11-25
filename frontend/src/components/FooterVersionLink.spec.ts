import { mount } from "@vue/test-utils";
import FooterVersionLink from "./FooterVersionLink.vue";

const repositoryUrl = "https://github.com/dnum-mi/referentiel-applications";

it("indique visiblement la version et sa destination, avec le changement de langue sur le mot anglais", () => {
  const link = mount(FooterVersionLink, { props: { version: "development" } });

  expect(link.get("span").text()).toBe("Version : development sur GitHub");
  expect(link.get('[lang="en"]').text()).toBe("development");
  expect(link.element).toHaveAccessibleName("Version : development sur GitHub (nouvelle fenêtre)");
  expect(link.attributes("target")).toBe("_blank");
  expect(link.attributes("rel")).toBe("noopener noreferrer");
});

it.each(["development", "main", "dev", "3360/merge"])("renvoie au dépôt pour la version de travail %s", (version) => {
  expect(mount(FooterVersionLink, { props: { version } }).attributes("href")).toBe(repositoryUrl);
});

it.each(["v1.106.0", "v1.2.3-rc.1", "1.1.7"])("renvoie à la publication avec le tag exact %s", (version) => {
  expect(mount(FooterVersionLink, { props: { version } }).attributes("href")).toBe(`${repositoryUrl}/releases/tag/${version}`);
});
