import { RelationType, type RelationDto } from "@/client/types.gen";
import { useRelationManager } from "./use-relation-manager";

// Le composable ne consomme du store que `relations` : un stub suffit, et il
// évite de dépendre d'une instance Pinia active dans ce test unitaire.
const storeMock = { relations: [] as (RelationDto & { isSource: boolean })[] };

vi.mock("@/stores/relationStore", () => ({
  useRelationStore: () => storeMock,
}));

vi.mock("@/stores/toasterStore", () => ({
  useToasterStore: () => ({ addSuccessMessage: vi.fn(), addErrorMessage: vi.fn() }),
}));

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

describe("useRelationManager — libellé de la corrélation (#2287)", () => {
  it("affiche le même libellé sur la fiche source et sur la fiche cible", () => {
    // Vue « fiche A » : la relation part de A
    storeMock.relations = [makeRelation({ isSource: true })];
    const fromSource = useRelationManager("app-a").rows.value[0];

    // Vue « fiche B » : la même relation, vue depuis la cible
    storeMock.relations = [makeRelation({ isSource: false })];
    const fromTarget = useRelationManager("app-b").rows.value[0];

    expect(fromSource.Relation).toBe("Est corrélée à");
    // Critère d'acceptation : relation symétrique, libellé identique des deux côtés
    expect(fromTarget.Relation).toBe(fromSource.Relation);
  });

  it("garde les libellés orientés distincts pour les autres types", () => {
    storeMock.relations = [makeRelation({ type: RelationType.IS_PART_OF, isSource: true })];
    const fromSource = useRelationManager("app-a").rows.value[0];

    storeMock.relations = [makeRelation({ type: RelationType.IS_PART_OF, isSource: false })];
    const fromTarget = useRelationManager("app-b").rows.value[0];

    expect(fromSource.Relation).toBe("Fait partie de");
    expect(fromTarget.Relation).not.toBe(fromSource.Relation);
  });

  it("présente l'application liée quel que soit le sens de stockage", () => {
    storeMock.relations = [makeRelation({ isSource: false })];
    const row = useRelationManager("app-b").rows.value[0];

    expect(row["Application Source"]).toBe("Application B");
    expect(row["Application Cible"]).toMatchObject({ label: "Application A", id: "app-a" });
  });
});
