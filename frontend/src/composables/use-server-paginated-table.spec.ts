import { effectScope } from "vue";
import { useServerPaginatedTable, type ServerTablePage, type ServerTableQuery } from "./use-server-paginated-table";

type Page = ServerTablePage<{ id: string }>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const scopes: ReturnType<typeof effectScope>[] = [];

function createTable(fetchPage: (query: ServerTableQuery) => Promise<Page | undefined>, pageSize = 15) {
  const scope = effectScope();
  scopes.push(scope);
  const table = scope.run(() => useServerPaginatedTable({ fetchPage, pageSize, initialSortColumn: "email" }))!;
  return { table, scope };
}

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
});

describe("useServerPaginatedTable", () => {
  it("transmet la page à index zéro et la taille choisie au serveur", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ results: [], total: 0 });
    const { table } = createTable(fetchPage, 10);

    expect(fetchPage).not.toHaveBeenCalled();
    await table.refresh();
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 0, pageSize: 10, sortBy: "email", order: "asc" });

    await table.onPage({ page: 2, rows: 20 });
    expect(fetchPage).toHaveBeenLastCalledWith({ page: 2, pageSize: 20, sortBy: "email", order: "asc" });
    expect(table.firstIndex.value).toBe(40);
  });

  it("repart en première page en triant et ne lance qu'une requête pour colonne + direction", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ results: [], total: 0 });
    const { table } = createTable(fetchPage);
    await table.onPage({ page: 3, rows: 15 });
    fetchPage.mockClear();

    await table.onSort({ sortField: "createdAt", sortOrder: -1 });

    expect(fetchPage).toHaveBeenCalledExactlyOnceWith({ page: 0, pageSize: 15, sortBy: "createdAt", order: "desc" });
    expect(table.currentPage.value).toBe(0);
    expect(table.firstIndex.value).toBe(0);
    expect(table.sortColumn.value).toBe("createdAt");
    expect(table.isSortDescending.value).toBe(true);
  });

  it("réinitialise la page d'un nouveau filtre sans perdre le tri ni la taille", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ results: [], total: 0 });
    const { table } = createTable(fetchPage);
    await table.onSort({ sortField: "name", sortOrder: -1 });
    await table.onPage({ page: 2, rows: 50 });

    await table.resetAndFetch();

    expect(fetchPage).toHaveBeenLastCalledWith({ page: 0, pageSize: 50, sortBy: "name", order: "desc" });
  });

  it("annonce le chargement, les résultats vides et les bornes de la dernière page", async () => {
    const pending = deferred<Page>();
    const fetchPage = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue({ results: [], total: 0 });
    const { table } = createTable(fetchPage);
    const status = table.statusMessage("organisations");

    const loading = table.onPage({ page: 2, rows: 15 });
    expect(status.value).toBe("Chargement des organisations…");
    pending.resolve({ results: [{ id: "31" }, { id: "32" }], total: 32 });
    await loading;
    expect(status.value).toBe("Résultat 31 à 32 sur 32");

    await table.resetAndFetch();
    expect(status.value).toBe("Aucune donnée ne correspond à votre recherche : Résultat 0 à 0");
  });

  it("n'annonce pas une plage inversée quand la page devient vide après une suppression", async () => {
    const { table } = createTable(async () => ({ results: [], total: 15 }));
    await table.onPage({ page: 1, rows: 15 });
    expect(table.statusMessage("tags").value).toBe("Résultat 0 à 0 sur 15");
  });

  it("ignore la réponse tardive d'une ancienne page", async () => {
    const previous = deferred<Page>();
    const current = deferred<Page>();
    const fetchPage = vi.fn().mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    const { table } = createTable(fetchPage);
    const previousLoad = table.refresh();
    const currentLoad = table.onPage({ page: 1, rows: 15 });

    current.resolve({ results: [{ id: "current" }], total: 16 });
    await currentLoad;
    previous.resolve({ results: [{ id: "previous" }], total: 99 });
    await previousLoad;

    expect(table.data.value).toEqual({ results: [{ id: "current" }], total: 16 });
    expect(table.statusMessage("tags").value).toBe("Résultat 16 à 16 sur 16");
    expect(table.isLoading.value).toBe(false);
  });

  it("un ancien échec ne masque pas le chargement ni n'affiche une erreur pour la requête courante", async () => {
    const previous = deferred<Page>();
    const current = deferred<Page>();
    const fetchPage = vi.fn().mockReturnValueOnce(previous.promise).mockReturnValueOnce(current.promise);
    const { table } = createTable(fetchPage);
    const previousLoad = table.refresh();
    const currentLoad = table.resetAndFetch();

    previous.reject(new Error("ancienne recherche"));
    await previousLoad;
    expect(table.isLoading.value).toBe(true);
    expect(table.hasError.value).toBe(false);
    expect(table.hasLoadedOnce.value).toBe(false);

    current.resolve({ results: [{ id: "current" }], total: 1 });
    await currentLoad;
    expect(table.hasLoadedOnce.value).toBe(true);
  });

  it("conserve les lignes déjà chargées après une erreur puis efface cette erreur après reprise", async () => {
    const page = { results: [{ id: "user" }], total: 1 };
    const failure = new Error("indisponible");
    const fetchPage = vi.fn().mockResolvedValueOnce(page).mockRejectedValueOnce(failure).mockResolvedValueOnce(page);
    const { table } = createTable(fetchPage);

    await table.refresh();
    await table.refresh();

    expect(table.data.value).toEqual(page);
    expect(table.hasLoadedOnce.value).toBe(true);
    expect(table.isLoading.value).toBe(false);
    expect(table.error.value).toBe(failure);
    expect(table.hasError.value).toBe(true);

    await table.refresh();
    expect(table.hasError.value).toBe(false);
  });

  it("termine le chargement même lorsque l'API ne retourne pas de données", async () => {
    const { table } = createTable(async () => undefined);
    await table.refresh();
    expect(table.isLoading.value).toBe(false);
    expect(table.hasLoadedOnce.value).toBe(false);
  });

  it("ignore les réponses et les callbacks différés après démontage", async () => {
    const pending = deferred<Page>();
    const fetchPage = vi.fn().mockReturnValue(pending.promise);
    const { table, scope } = createTable(fetchPage);
    const loading = table.refresh();

    scope.stop();
    pending.resolve({ results: [{ id: "obsolete" }], total: 1 });
    await loading;
    await table.resetAndFetch();

    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(table.data.value).toEqual({ results: [], total: 0 });
    expect(table.hasLoadedOnce.value).toBe(false);
    expect(table.isLoading.value).toBe(false);
  });
});
