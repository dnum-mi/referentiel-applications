import { RelationType, Status } from "@prisma/client";
import {
  ALL_ENUM_LABELS,
  ApplicationStatusLabels,
  RelationTypeLabels,
} from "./enum-label";
import { RelationTypeLabelsBidirectional } from "./relation-type-labels";

describe("enum-label (#2246)", () => {
  it("couvre tous les types de relation, y compris use_sso_of", () => {
    for (const type of Object.values(RelationType)) {
      expect(RelationTypeLabels[type]).toBeTruthy();
      expect(ALL_ENUM_LABELS[type]).toBe(RelationTypeLabels[type]);
    }
  });

  it("dérive les libellés « source » de la map bidirectionnelle unique", () => {
    for (const [type, labels] of Object.entries(
      RelationTypeLabelsBidirectional,
    )) {
      expect(RelationTypeLabels[type as RelationType]).toBe(labels.source);
    }
  });

  it("couvre tous les statuts d'application", () => {
    for (const status of Object.values(Status)) {
      expect(ApplicationStatusLabels[status]).toBeTruthy();
    }
  });
});
