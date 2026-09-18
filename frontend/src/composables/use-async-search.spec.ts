import { effectScope } from "vue";
import { useAsyncSearch } from "./use-async-search";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useAsyncSearch", () => {
  it("conserve les résultats de la dernière saisie si les réponses arrivent en désordre", async () => {
    const first = deferred<string[]>();
    const second = deferred<string[]>();
    const search = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const state = useAsyncSearch<string>(search);

    const firstQuery = state.onQuery("premier");
    const secondQuery = state.onQuery("second");
    second.resolve(["récent"]);
    await secondQuery;
    first.resolve(["ancien"]);
    await firstQuery;

    expect(state.results.value).toEqual(["récent"]);
    expect(state.isLoading.value).toBe(false);
    expect(state.error.value).toBe("");
  });

  it("ne termine pas le chargement actif lorsqu'une ancienne requête échoue", async () => {
    const first = deferred<string[]>();
    const second = deferred<string[]>();
    const state = useAsyncSearch<string>(vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise));
    const firstQuery = state.onQuery("ancien");
    const secondQuery = state.onQuery("actuel");

    first.reject(new Error("échec ancien"));
    await firstQuery;
    expect(state.isLoading.value).toBe(true);
    expect(state.error.value).toBe("");
    second.resolve(["actuel"]);
    await secondQuery;
    expect(state.results.value).toEqual(["actuel"]);
  });

  it("efface l'erreur dès la prochaine recherche, et distingue l'échec d'un résultat vide", async () => {
    const search = vi.fn().mockRejectedValueOnce(new Error("indisponible")).mockResolvedValueOnce([]);
    const state = useAsyncSearch<string>(search, { errorMessage: "Recherche indisponible" });

    await state.onQuery("premier");
    expect(state.error.value).toBe("Recherche indisponible");
    expect(state.hasSearched.value).toBe(true);
    const retry = state.onQuery("second");
    expect(state.error.value).toBe("");
    expect(state.isLoading.value).toBe(true);
    await retry;
    expect(state.results.value).toEqual([]);
    expect(state.hasSearched.value).toBe(true);
    expect(state.isLoading.value).toBe(false);
  });

  it("invalide les recherches en vol sous le seuil et après effacement", async () => {
    const pending = deferred<string[]>();
    const search = vi.fn(() => pending.promise);
    const state = useAsyncSearch(search, { minLength: 4 });
    await state.onQuery("abc");
    expect(search).not.toHaveBeenCalled();

    const query = state.onQuery("abcd");
    await state.onQuery("");
    pending.resolve(["périmé"]);
    await query;
    expect(state.results.value).toEqual([]);
    expect(state.isLoading.value).toBe(false);
    expect(state.hasSearched.value).toBe(false);
  });

  it("isole les champs et garde une sélection initiale pendant une réinitialisation", async () => {
    const pending = deferred<string[]>();
    const target = useAsyncSearch(() => pending.promise);
    const mediation = useAsyncSearch(async () => ["médiation"]);
    const query = target.onQuery("cible");
    await mediation.onQuery("médiation");
    target.reset(["sélection"]);
    pending.resolve(["ancienne cible"]);
    await query;

    expect(target.results.value).toEqual(["sélection"]);
    expect(mediation.results.value).toEqual(["médiation"]);
  });

  it("ignore les réponses et les callbacks différés après démontage", async () => {
    const pending = deferred<string[]>();
    const search = vi.fn(() => pending.promise);
    const scope = effectScope();
    const state = scope.run(() => useAsyncSearch(search))!;
    const query = state.onQuery("premier");
    scope.stop();
    pending.resolve(["trop tard"]);
    await query;
    await state.onQuery("différé");

    expect(search).toHaveBeenCalledTimes(1);
    expect(state.results.value).toEqual([]);
    expect(state.isLoading.value).toBe(false);
  });
});
