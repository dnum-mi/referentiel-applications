import { createPinia, setActivePinia } from "pinia";
import { useToasterStore } from "./toasterStore";

describe("toasterStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("laisse le temps de lire le message jusqu'à sa fermeture", () => {
    const store = useToasterStore();
    store.addErrorMessage("Enregistrement refusé");
    vi.advanceTimersByTime(60_000);
    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].closeable).toBe(true);
    store.removeMessage(store.messages[0].id);
    expect(store.messages).toHaveLength(0);
  });
});
