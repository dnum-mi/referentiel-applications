import { effectScope, nextTick, reactive, ref } from "vue";
import { useFilterWatcher } from "./use-filter-watcher";

describe("useFilterWatcher", () => {
  let scope: ReturnType<typeof effectScope>;

  beforeEach(() => {
    vi.useFakeTimers();
    scope = effectScope();
  });

  afterEach(() => {
    scope.stop();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("regroupe les changements de plusieurs filtres en un seul appel", async () => {
    const filters = reactive({ label: "", statuses: ["active"] });
    const callback = vi.fn();
    scope.run(() => useFilterWatcher(filters, callback));
    filters.label = "ref";
    await nextTick();
    await vi.advanceTimersByTimeAsync(200);
    filters.statuses.push("draft");
    await nextTick();
    await vi.advanceTimersByTimeAsync(299);
    expect(callback).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("observe aussi les refs et respecte les clés demandées", async () => {
    const filters = { label: ref(""), ignored: ref(0) };
    const callback = vi.fn();
    scope.run(() => useFilterWatcher(filters, callback, ["label"]));
    filters.ignored.value++;
    await nextTick();
    await vi.advanceTimersByTimeAsync(300);
    expect(callback).not.toHaveBeenCalled();
    filters.label.value = "refapp";
    await nextTick();
    await vi.advanceTimersByTimeAsync(300);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
