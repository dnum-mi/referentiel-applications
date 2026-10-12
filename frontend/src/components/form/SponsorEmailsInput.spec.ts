import { mount, enableAutoUnmount } from "@vue/test-utils";
import SponsorEmailsInput from "./SponsorEmailsInput.vue";
enableAutoUnmount(afterEach);
describe("SponsorEmailsInput — regroupement des adresses", () => {
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
