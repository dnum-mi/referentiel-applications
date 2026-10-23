import { effectScope, reactive, ref, type EffectScope, type Ref } from "vue";
import { RelationType, type RelationDto } from "@/client/types.gen";
import { useRelationManager } from "./use-relation-manager";

const { addSuccessMessage, addErrorMessage, deleteRelation } = vi.hoisted(() => ({
  addSuccessMessage: vi.fn(),
  addErrorMessage: vi.fn(),
  deleteRelation: vi.fn(),
}));
const storeMock = reactive({
  relations: [] as (RelationDto & { isSource: boolean })[],
  activeApplicationId: "app-a" as string | null,
  contextVersion: 0,
  fetchRelationsByApplication: vi.fn(),
  createRelation: vi.fn(),
  updateRelation: vi.fn(),
});
vi.mock("@/stores/relationStore", () => ({ useRelationStore: () => storeMock }));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addSuccessMessage, addErrorMessage }) }));
vi.mock("@/api/index", () => ({ default: { relationControllerDelete: deleteRelation } }));

function makeRelation(overrides: Partial<RelationDto & { isSource: boolean }> = {}) {
  return {
    id: "rel-1",
    applicationSourceId: "app-a",
    applicationTargetId: "app-b",
    sourceApplication: { id: "app-a", label: "Application A" },
    targetApplication: { id: "app-b", label: "Application B" },
    type: RelationType.IS_CORRELATED_WITH,
    isSource: true,
    ...overrides,
  } as RelationDto & { isSource: boolean };
}

const scopes: EffectScope[] = [];
function createManager(applicationId = ref("app-a")) {
  const scope = effectScope();
  scopes.push(scope);
  return { manager: scope.run(() => useRelationManager(applicationId))!, applicationId, scope };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function switchApplication(applicationId: Ref<string>, id: string) {
  applicationId.value = id;
  storeMock.contextVersion++;
  storeMock.activeApplicationId = id;
  storeMock.relations = [makeRelation({ id: `rel-${id}`, applicationSourceId: id })];
}
beforeEach(() => {
  vi.clearAllMocks();
  storeMock.activeApplicationId = "app-a";
  storeMock.contextVersion = 1;
  storeMock.relations = [makeRelation()];
  storeMock.fetchRelationsByApplication.mockResolvedValue(true);
  storeMock.createRelation.mockResolvedValue(true);
  storeMock.updateRelation.mockResolvedValue(true);
  deleteRelation.mockResolvedValue({ response: { ok: true } });
});
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
});

describe("useRelationManager — libellé de la corrélation (#2287)", () => {
  it("affiche le même libellé sur la fiche source et sur la fiche cible", () => {
    const fromSource = createManager().manager.rows.value[0];
    storeMock.activeApplicationId = "app-b";
    storeMock.relations = [makeRelation({ isSource: false })];
    const fromTarget = createManager(ref("app-b")).manager.rows.value[0];
    expect(fromSource.Relation).toBe("Est corrélée à");
    expect(fromTarget.Relation).toBe(fromSource.Relation);
  });

  it("garde les libellés orientés distincts pour les autres types", () => {
    storeMock.relations = [makeRelation({ type: RelationType.IS_PART_OF, isSource: true })];
    const fromSource = createManager().manager.rows.value[0];
    storeMock.activeApplicationId = "app-b";
    storeMock.relations = [makeRelation({ type: RelationType.IS_PART_OF, isSource: false })];
    const fromTarget = createManager(ref("app-b")).manager.rows.value[0];
    expect(fromSource.Relation).toBe("Fait partie de");
    expect(fromTarget.Relation).not.toBe(fromSource.Relation);
  });

  it("présente l'application liée quel que soit le sens de stockage", () => {
    storeMock.activeApplicationId = "app-b";
    storeMock.relations = [makeRelation({ isSource: false })];
    const row = createManager(ref("app-b")).manager.rows.value[0];
    expect(row["Application Source"]).toBe("Application B");
    expect(row["Application Cible"]).toMatchObject({ label: "Application A", id: "app-a" });
  });
});

describe("useRelationManager — contexte de fiche (#2951)", () => {
  it("ne présente pas les relations d'une autre application", () => {
    const { manager, applicationId } = createManager();
    applicationId.value = "app-b";
    expect(manager.rows.value).toEqual([]);
  });

  it("réinitialise sélection, page et modales au changement de fiche et à la purge", () => {
    const { manager, applicationId } = createManager();
    manager.currentPage.value = 4;
    manager.rows.value[0].Actions.edit();
    manager.rows.value[0].Actions.delete();
    manager.openAddRelationModal();
    switchApplication(applicationId, "app-b");
    expect(manager.selectedRelationIds.value).toEqual([]);
    expect(manager.currentPage.value).toBe(0);
    expect(manager.relationToEdit.value).toBeNull();
    expect(manager.showDeleteConfirmation.value).toBe(false);
    expect(manager.isAddRelationModalOpen.value).toBe(false);
    expect(manager.isEditRelationModalOpen.value).toBe(false);
    manager.rows.value[0].Actions.delete();
    storeMock.contextVersion++;
    storeMock.activeApplicationId = null;
    storeMock.relations = [];
    expect(manager.selectedRelationIds.value).toEqual([]);
    expect(manager.showDeleteConfirmation.value).toBe(false);
    expect(manager.rows.value).toEqual([]);
  });

  it("invalide les actions des anciennes lignes même après A → B → A", () => {
    const { manager, applicationId } = createManager();
    const oldRow = manager.rows.value[0];
    switchApplication(applicationId, "app-b");
    switchApplication(applicationId, "app-a");
    oldRow.Actions.edit();
    oldRow.Actions.delete();
    expect(manager.isEditRelationModalOpen.value).toBe(false);
    expect(manager.showDeleteConfirmation.value).toBe(false);
  });

  it("utilise la fiche courante réactive pour modifier une relation entrante", async () => {
    const { manager, applicationId } = createManager();
    switchApplication(applicationId, "app-b");
    const relation = makeRelation({ id: "incoming", applicationTargetId: "app-b", isSource: false });
    storeMock.relations = [relation];
    await manager.handleUpdateRelation(relation);
    expect(storeMock.updateRelation).toHaveBeenCalledWith(relation, "app-b");
    expect(addSuccessMessage).toHaveBeenCalledOnce();
  });

  it.each(["success", "failure"] as const)(
    "ignore une modification tardive (%s) sans fermer la modale de la nouvelle fiche",
    async (outcome) => {
      const pending = deferred<boolean>();
      storeMock.updateRelation.mockReturnValueOnce(pending.promise);
      const { manager, applicationId } = createManager();
      const operation = manager.handleUpdateRelation(makeRelation());
      switchApplication(applicationId, "app-b");
      manager.rows.value[0].Actions.edit();
      if (outcome === "success") pending.resolve(true);
      else pending.reject(new Error("Ancien contexte"));
      await operation;
      expect(manager.isEditRelationModalOpen.value).toBe(true);
      expect(manager.relationToEdit.value?.id).toBe("rel-app-b");
      expect(addSuccessMessage).not.toHaveBeenCalled();
      expect(addErrorMessage).not.toHaveBeenCalled();
    },
  );

  it("ignore une création terminée après A → B → A", async () => {
    const pending = deferred<boolean>();
    storeMock.createRelation.mockReturnValueOnce(pending.promise);
    const { manager, applicationId } = createManager();
    const operation = manager.handleCreateRelation(makeRelation());
    switchApplication(applicationId, "app-b");
    switchApplication(applicationId, "app-a");
    manager.openAddRelationModal();
    pending.resolve(true);
    await operation;
    expect(manager.isAddRelationModalOpen.value).toBe(true);
    expect(addSuccessMessage).not.toHaveBeenCalled();
  });

  it("ne relance pas un chargement de l'ancienne fiche après suppression groupée", async () => {
    const pending = deferred<{ response: { ok: boolean } }>();
    deleteRelation.mockReturnValueOnce(pending.promise);
    const { manager, applicationId } = createManager();
    manager.selectedRelationIds.value = ["rel-1"];
    const operation = manager.confirmDelete();
    expect(deleteRelation).toHaveBeenCalledWith({ path: { applicationId: "app-a", id: "rel-1" } });
    switchApplication(applicationId, "app-b");
    manager.rows.value[0].Actions.delete();
    pending.resolve({ response: { ok: true } });
    await operation;
    expect(storeMock.fetchRelationsByApplication).not.toHaveBeenCalled();
    expect(manager.selectedRelationIds.value).toEqual(["rel-app-b"]);
    expect(manager.showDeleteConfirmation.value).toBe(true);
    expect(addSuccessMessage).not.toHaveBeenCalled();
  });

  it("ignore les effets d'une mutation après démontage", async () => {
    const pending = deferred<boolean>();
    storeMock.createRelation.mockReturnValueOnce(pending.promise);
    const { manager, scope } = createManager();
    const operation = manager.handleCreateRelation(makeRelation());
    scope.stop();
    pending.resolve(true);
    await operation;
    expect(addSuccessMessage).not.toHaveBeenCalled();
  });
});
