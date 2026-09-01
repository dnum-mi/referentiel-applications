import { RelationType } from "@/client/types.gen";
import { buildRelationUpdate } from "./relation-update";

const relation = { id: "rel-1", applicationSourceId: "app-a" };

describe("buildRelationUpdate (#2385)", () => {
  it("depuis la fiche source : la contre-partie devient la cible", () => {
    const payload = buildRelationUpdate(relation, "app-a", {
      type: RelationType.IS_PART_OF,
      mediationServiceId: null,
      counterpartId: "app-c",
    });
    expect(payload).toEqual({
      id: "rel-1",
      applicationSourceId: "app-a",
      applicationTargetId: "app-c",
      type: RelationType.IS_PART_OF,
      mediationServiceId: null,
    });
  });

  it("depuis la fiche cible : source et sens inchangés, cible = app courante (pas de détachement)", () => {
    const payload = buildRelationUpdate(relation, "app-b", {
      type: RelationType.IS_SERVICE_USER_OF,
      mediationServiceId: "med-1",
      // Même si une contre-partie est fournie, elle est ignorée côté cible.
      counterpartId: "app-should-be-ignored",
    });
    expect(payload).toEqual({
      id: "rel-1",
      applicationSourceId: "app-a",
      applicationTargetId: "app-b",
      type: RelationType.IS_SERVICE_USER_OF,
      mediationServiceId: "med-1",
    });
  });
});
