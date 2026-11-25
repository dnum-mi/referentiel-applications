import { mount } from "@vue/test-utils";
import { defineComponent, nextTick } from "vue";
import { useApplicationFormState } from "./use-application-form-state";

const mocks = vi.hoisted(() => ({ fetchAll: vi.fn(), actorTypes: [] as { id: string; code: string }[] }));
vi.mock("@/stores/actorTypeStore", () => ({ useActorTypeStore: () => mocks }));

it("ignore les types chargés tardivement sans effacer les saisies effectuées pendant le chargement", async () => {
  let loaded = () => {};
  mocks.fetchAll.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        loaded = resolve;
      }),
  );
  let state!: ReturnType<typeof useApplicationFormState>;
  const wrapper = mount(
    defineComponent({
      setup() {
        state = useApplicationFormState({}, () => "create");
        return () => null;
      },
    }),
  );
  expect(state.isFormDirty.value).toBe(false);
  state.form.value.label = "Saisie";
  mocks.actorTypes.push({ id: "moa", code: "MOA" }, { id: "moe", code: "MOE" });
  loaded();
  await nextTick();
  expect(state.moa.value.actorTypeId).toBe("moa");
  expect(state.isFormDirty.value).toBe(true);
  state.form.value.label = "";
  expect(state.isFormDirty.value).toBe(false);
  state.moa.value.isGroup = true;
  expect(state.isFormDirty.value).toBe(true);
  state.moa.value.isGroup = false;
  state.moe.value.email = "test@example.com";
  expect(state.isFormDirty.value).toBe(true);
  state.moe.value.email = "";
  expect(state.isFormDirty.value).toBe(false);
  state.form.value.tags = ["tag"];
  expect(state.isFormDirty.value).toBe(true);
  state.form.value.tags = [];
  expect(state.isFormDirty.value).toBe(false);
  wrapper.unmount();
});
