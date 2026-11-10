import { effectScope, ref } from "vue";
import { useMaiaRequest } from "./use-maia-request";

it("invalide immédiatement un changement d'identité et isole la fin d'une ancienne requête", () => {
  const scope = effectScope();
  const email = ref("alice@example.test");
  const state = scope.run(() => useMaiaRequest([() => email.value]))!;
  const old = state.begin()!;
  expect(state.begin()).toBeUndefined();
  email.value = "bob@example.test";
  const current = state.begin()!;
  expect(old.isCurrent()).toBe(false);
  old.finish();
  expect(state.isSyncing.value).toBe(true);
  scope.stop();
  expect(current.isCurrent()).toBe(false);
  expect(state.isSyncing.value).toBe(false);
  expect(state.begin()).toBeUndefined();
});
