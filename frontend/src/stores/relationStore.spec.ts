import { createPinia, setActivePinia } from "pinia";
import { RelationType, type RelationDto } from "@/client";
import { useRelationStore } from "./relationStore";

const { findAll, create, update, remove } = vi.hoisted(() => ({
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/api/index", () => ({
  default: {
    relationControllerFindAll: findAll,
    relationControllerCreate: create,
    relationControllerUpdate: update,
    relationControllerDelete: remove,
  },
}));

type ApiResult = { response: { ok: boolean }; data?: RelationDto[]; error?: unknown };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function relation(id: string, source: string, target = `${source}-target`): RelationDto {
  return {
    id,
    applicationSourceId: source,
    applicationTargetId: target,
    type: RelationType.IS_PART_OF,
    mediationServiceId: null,
    mediationService: null,
    sourceApplication: { id: source, label: source },
    targetApplication: { id: target, label: target },
  };
}
function success(...relations: RelationDto[]): ApiResult {
  return { response: { ok: true }, data: relations };
}

beforeEach(() => {
  setActivePinia(createPinia());
  for (const mock of [findAll, create, update, remove]) mock.mockReset();
});

it("isole immédiatement le contexte de B et ignore une réponse lente de A", async () => {
  const first = deferred<ApiResult>();
  findAll.mockReturnValueOnce(first.promise).mockResolvedValueOnce(success(relation("b", "B")));
  const store = useRelationStore();
  const pending = store.fetchRelationsByApplication("A");
  await expect(store.fetchRelationsByApplication("B")).resolves.toBe(true);
  expect(store.activeApplicationId).toBe("B");
  expect(store.relations.map(({ id }) => id)).toEqual(["b"]);
  first.resolve(success(relation("a", "A")));
  await expect(pending).resolves.toBe(false);
  expect(store.relations.map(({ id }) => id)).toEqual(["b"]);
});

it("ignore aussi la première réponse A après un aller-retour A → B → A", async () => {
  const oldA = deferred<ApiResult>();
  const newA = deferred<ApiResult>();
  findAll
    .mockReturnValueOnce(oldA.promise)
    .mockResolvedValueOnce(success(relation("b", "B")))
    .mockReturnValueOnce(newA.promise);
  const store = useRelationStore();
  const first = store.fetchRelationsByApplication("A");
  await store.fetchRelationsByApplication("B");
  const current = store.fetchRelationsByApplication("A");
  oldA.resolve(success(relation("old-a", "A")));
  await expect(first).resolves.toBe(false);
  expect(store.relations).toEqual([]);
  newA.resolve(success(relation("new-a", "A")));
  await expect(current).resolves.toBe(true);
  expect(store.relations.map(({ id }) => id)).toEqual(["new-a"]);
});

it("ne publie que la dernière lecture, même pour la même application", async () => {
  const first = deferred<ApiResult>();
  findAll.mockReturnValueOnce(first.promise).mockResolvedValueOnce(success(relation("new-a", "A")));
  const store = useRelationStore();
  const pending = store.fetchRelationsByApplication("A");
  await store.fetchRelationsByApplication("A");
  first.resolve(success(relation("old-a", "A")));
  await expect(pending).resolves.toBe(false);
  expect(store.relations.map(({ id }) => id)).toEqual(["new-a"]);
});

it.each(["http", "network"])("vide les relations de A pendant B puis après son erreur %s", async (kind) => {
  const second = deferred<ApiResult>();
  findAll.mockResolvedValueOnce(success(relation("a", "A"))).mockReturnValueOnce(second.promise);
  const store = useRelationStore();
  await store.fetchRelationsByApplication("A");
  const pending = store.fetchRelationsByApplication("B");
  const assertion = expect(pending).rejects.toThrow();
  expect(store.relations).toEqual([]);
  expect(store.activeApplicationId).toBe("B");
  if (kind === "http") second.resolve({ response: { ok: false } });
  else second.reject(new TypeError("Failed to fetch"));
  await assertion;
  expect(store.relations).toEqual([]);
});

it.each(["http", "network"])("ignore une erreur %s de l'ancien contexte sans vider B", async (kind) => {
  const first = deferred<ApiResult>();
  findAll.mockReturnValueOnce(first.promise).mockResolvedValueOnce(success(relation("b", "B")));
  const store = useRelationStore();
  const pending = store.fetchRelationsByApplication("A");
  await store.fetchRelationsByApplication("B");
  if (kind === "http") first.resolve({ response: { ok: false } });
  else first.reject(new TypeError("Failed to fetch"));
  await expect(pending).resolves.toBe(false);
  expect(store.relations.map(({ id }) => id)).toEqual(["b"]);
});

it("une purge invalide les lectures en cours et conserve l'absence de contexte", async () => {
  const first = deferred<ApiResult>();
  findAll.mockReturnValueOnce(first.promise);
  const store = useRelationStore();
  const pending = store.fetchRelationsByApplication("A");
  store.clearRelations();
  first.resolve(success(relation("a", "A")));
  await expect(pending).resolves.toBe(false);
  expect(store.activeApplicationId).toBeNull();
  expect(store.relations).toEqual([]);
});

it("une ancienne purge conditionnelle ne peut pas supprimer un nouveau contexte", async () => {
  findAll.mockResolvedValueOnce(success(relation("a", "A"))).mockResolvedValueOnce(success(relation("b", "B")));
  const store = useRelationStore();
  await store.fetchRelationsByApplication("A");
  const version = store.contextVersion;
  await store.fetchRelationsByApplication("B");
  store.clearRelations(version);
  expect(store.activeApplicationId).toBe("B");
  expect(store.relations.map(({ id }) => id)).toEqual(["b"]);
});

it("un nouveau propriétaire de la même fiche invalide une lecture de l'ancien onglet", async () => {
  const oldRead = deferred<ApiResult>();
  findAll.mockReturnValueOnce(oldRead.promise).mockResolvedValueOnce(success(relation("new-a", "A")));
  const store = useRelationStore();
  const oldLease = store.beginContext("A");
  const pending = store.fetchRelationsByApplication("A");
  const newLease = store.beginContext("A");
  expect(newLease).not.toBe(oldLease);
  await store.fetchRelationsByApplication("A");
  store.clearRelations(oldLease);
  oldRead.resolve(success(relation("old-a", "A")));
  await expect(pending).resolves.toBe(false);
  expect(store.activeApplicationId).toBe("A");
  expect(store.relations.map(({ id }) => id)).toEqual(["new-a"]);
  store.clearRelations(newLease);
  expect(store.activeApplicationId).toBeNull();
  expect(store.relations).toEqual([]);
});

const operations = [
  { name: "création", mock: create, run: (store: ReturnType<typeof useRelationStore>) => store.createRelation(relation("a", "A")) },
  {
    name: "modification",
    mock: update,
    run: (store: ReturnType<typeof useRelationStore>) => store.updateRelation(relation("a", "A"), "A"),
  },
  {
    name: "suppression",
    mock: remove,
    run: (store: ReturnType<typeof useRelationStore>) => store.deleteRelation(relation("a", "A"), "A"),
  },
];

describe.each(operations)("$name", ({ mock, run }) => {
  it.each(["avant", "après"])("ignore une mutation de l'ancien onglet A, démonté %s le nouveau montage A", async (order) => {
    const mutation = deferred<ApiResult>();
    findAll.mockResolvedValueOnce(success(relation("old-a", "A"))).mockResolvedValueOnce(success(relation("new-a", "A")));
    const store = useRelationStore();
    const oldLease = store.beginContext("A");
    await store.fetchRelationsByApplication("A");
    mock.mockReturnValueOnce(mutation.promise);
    const pending = run(store);
    if (order === "avant") store.clearRelations(oldLease);
    const newLease = store.beginContext("A");
    await store.fetchRelationsByApplication("A");
    if (order === "après") store.clearRelations(oldLease);
    mutation.resolve({ response: { ok: true } });
    await expect(pending).resolves.toBe(false);
    expect(findAll).toHaveBeenCalledTimes(2);
    expect(store.contextVersion).toBe(newLease);
    expect(store.activeApplicationId).toBe("A");
    expect(store.relations.map(({ id }) => id)).toEqual(["new-a"]);
  });

  it.each(["navigation", "aller-retour", "purge"])("ne réactive pas A après %s pendant une mutation", async (change) => {
    const mutation = deferred<ApiResult>();
    findAll.mockResolvedValue(success(relation("a", "A")));
    const store = useRelationStore();
    await store.fetchRelationsByApplication("A");
    mock.mockReturnValueOnce(mutation.promise);
    const pending = run(store);
    if (change === "purge") store.clearRelations();
    else {
      findAll.mockResolvedValueOnce(success(relation("b", "B")));
      await store.fetchRelationsByApplication("B");
      if (change === "aller-retour") {
        findAll.mockResolvedValueOnce(success(relation("new-a", "A")));
        await store.fetchRelationsByApplication("A");
      }
    }
    const before = [...store.relations];
    const calls = findAll.mock.calls.length;
    mutation.resolve({ response: { ok: true } });
    await expect(pending).resolves.toBe(false);
    expect(findAll).toHaveBeenCalledTimes(calls);
    expect(store.relations).toEqual(before);
  });

  it("ignore aussi l'erreur d'une mutation devenue obsolète", async () => {
    const mutation = deferred<ApiResult>();
    findAll.mockResolvedValue(success(relation("a", "A")));
    const store = useRelationStore();
    await store.fetchRelationsByApplication("A");
    mock.mockReturnValueOnce(mutation.promise);
    const pending = run(store);
    await store.fetchRelationsByApplication("B");
    mutation.reject(new Error("Ancienne mutation refusée"));
    await expect(pending).resolves.toBe(false);
    expect(findAll).toHaveBeenCalledTimes(2);
  });

  it("rafraîchit les relations après une mutation du contexte courant", async () => {
    findAll.mockResolvedValueOnce(success(relation("a", "A"))).mockResolvedValueOnce(success(relation("updated", "A")));
    const store = useRelationStore();
    await store.fetchRelationsByApplication("A");
    mock.mockResolvedValueOnce({ response: { ok: true } });
    await expect(run(store)).resolves.toBe(true);
    expect(findAll).toHaveBeenLastCalledWith({ path: { applicationId: "A" } });
    expect(store.relations.map(({ id }) => id)).toEqual(["updated"]);
  });

  it("propage le refus HTTP d'une mutation courante sans la rafraîchir", async () => {
    findAll.mockResolvedValueOnce(success(relation("a", "A")));
    const store = useRelationStore();
    await store.fetchRelationsByApplication("A");
    mock.mockResolvedValueOnce({ response: { ok: false } });
    await expect(run(store)).rejects.toThrow();
    expect(findAll).toHaveBeenCalledTimes(1);
    expect(store.relations.map(({ id }) => id)).toEqual(["a"]);
  });
});

it("conserve les relations entrantes et sortantes du contexte courant", async () => {
  findAll.mockResolvedValueOnce(success(relation("out", "A", "B"), relation("in", "C", "A")));
  const store = useRelationStore();
  await store.fetchRelationsByApplication("A");
  expect(store.relationsAsSource.map(({ id }) => id)).toEqual(["out"]);
  expect(store.relationsAsTarget.map(({ id }) => id)).toEqual(["in"]);
});

it("une création autonome ouvre uniquement son contexte et recharge ses relations", async () => {
  const store = useRelationStore();
  create.mockResolvedValueOnce({ response: { ok: true } });
  findAll.mockResolvedValueOnce(success(relation("a", "A")));
  await expect(store.createRelation(relation("a", "A"))).resolves.toBe(true);
  expect(store.activeApplicationId).toBe("A");
  expect(store.relations.map(({ id }) => id)).toEqual(["a"]);
});

it("une modification entrante conserve l'application consultée pour la route et le rafraîchissement", async () => {
  const incoming = relation("incoming", "C", "A");
  findAll.mockResolvedValue(success(incoming));
  const store = useRelationStore();
  await store.fetchRelationsByApplication("A");
  update.mockResolvedValueOnce({ response: { ok: true } });
  await expect(store.updateRelation(incoming, "A")).resolves.toBe(true);
  expect(update).toHaveBeenCalledWith({
    path: { applicationId: "A", id: "incoming" },
    body: { applicationTargetId: "A", type: incoming.type, mediationServiceId: null },
  });
  expect(findAll).toHaveBeenLastCalledWith({ path: { applicationId: "A" } });
  expect(store.relationsAsTarget.map(({ id }) => id)).toEqual(["incoming"]);
});
