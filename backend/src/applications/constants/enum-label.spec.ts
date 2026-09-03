import { RelationType, Status, TechnologyEolSource } from "@prisma/client";
import {
  ALL_ENUM_LABELS,
  ApplicationStatusLabels,
  RelationTypeLabels,
  TechnologyEolSourceLabels,
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

  // #2454 : l'historique doit lire « saisie manuelle », pas la valeur brute « manual ».
  it("couvre les origines de fin de vie d'une technologie", () => {
    for (const source of Object.values(TechnologyEolSource)) {
      expect(TechnologyEolSourceLabels[source]).toBeTruthy();
      expect(ALL_ENUM_LABELS[source]).toBe(TechnologyEolSourceLabels[source]);
    }
  });
});
