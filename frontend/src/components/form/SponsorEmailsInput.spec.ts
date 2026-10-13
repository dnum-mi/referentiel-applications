import { mount, enableAutoUnmount } from "@vue/test-utils";
import SponsorEmailsInput from "./SponsorEmailsInput.vue";
enableAutoUnmount(afterEach);
describe("SponsorEmailsInput — regroupement des adresses", () => {
  it("place le focus dans la nouvelle adresse, puis revient à Ajouter après suppression de la dernière ligne", async () => {
    const wrapper = mount(SponsorEmailsInput, { attachTo: document.body, global: { stubs: { VIcon: true } } });
    const add = wrapper.get<HTMLButtonElement>('[data-testid="sponsor-email-add"]');
    add.element.focus();
    await add.trigger("click");
    expect(wrapper.get("input").element).toHaveFocus();
    const remove = wrapper.get<HTMLButtonElement>('[data-testid="sponsor-email-remove-0"]');
    remove.element.focus();
    await remove.trigger("click");
    expect(wrapper.find("input").exists()).toBe(false);
    expect(add.element).toHaveFocus();
  });

  it("retrouve une adresse survivante avec sa valeur quand une ligne est supprimée", async () => {
    const wrapper = mount(SponsorEmailsInput, {
      attachTo: document.body,
      props: { modelValue: ["premier@example.test", "second@example.test"] },
      global: { stubs: { VIcon: true } },
    });
    const remove = wrapper.get<HTMLButtonElement>('[data-testid="sponsor-email-remove-0"]');
    remove.element.focus();
    await remove.trigger("click");
    expect(wrapper.get("input").element).toHaveValue("second@example.test");
    expect(wrapper.get("input").element).toHaveFocus();
    expect(wrapper.get("input").element).toHaveAccessibleName("Email du sponsor 1");
  });
  it("nomme le groupe de plusieurs champs et conserve leurs étiquettes distinctes", () => {
    const wrapper = mount(SponsorEmailsInput, {
      attachTo: document.body,
      props: { modelValue: ["premier@example.test", "second@example.test"] },
      global: { stubs: { VIcon: true } },
    });
    expect(wrapper.get("fieldset").element).toHaveAccessibleName("Adresses email des sponsors (optionnel)");
    const fields = wrapper.findAll("input");
    expect(fields[0].element).toHaveAccessibleName("Email du sponsor 1");
    expect(fields[1].element).toHaveAccessibleName("Email du sponsor 2");
  });
});
