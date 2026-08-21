import { RelationType } from "@prisma/client";
import { RelationService } from "./relation.service";
import type { IRelationRepository } from "./infrastructure/repository/relation.repository.interface";
import type { MetadatasService } from "src/metadatas/metadatas.service";
import type { RelationApplicationDto } from "./application/dto/relation-application.dto";

describe("RelationService — ordre canonique des corrélations (#2281)", () => {
  // Deux identifiants dont l'ordre lexicographique est connu : "app-a" < "app-b".
  const SOURCE = "app-a";
  const TARGET = "app-b";

  const createdRelation = {
    id: "rel-1",
    sourceApplication: { id: SOURCE, label: "Application A" },
    targetApplication: { id: TARGET, label: "Application B" },
  };

  const makeService = () => {
    const repository = {
      create: jest.fn().mockResolvedValue(createdRelation),
    } as unknown as IRelationRepository;
    const metadataService = {
      createMetadata: jest.fn().mockResolvedValue(undefined),
    } as unknown as MetadatasService;
    return {
      service: new RelationService(repository, metadataService),
      repository,
    };
  };

  const dto = (type: RelationType, applicationTargetId: string) =>
    ({ type, applicationTargetId }) as RelationApplicationDto;

  it("réordonne la paire quand la corrélation est créée « à l'envers »", async () => {
    const { service, repository } = makeService();

    // L'utilisateur part de la fiche B et vise A : sans normalisation, la
    // relation serait stockée B→A, doublon de la paire A→B déjà possible.
    await service.create(
      TARGET,
      dto(RelationType.is_correlated_with, SOURCE),
      "user-1",
    );

    expect(repository.create).toHaveBeenCalledWith(
      SOURCE,
      expect.objectContaining({ applicationTargetId: TARGET }),
    );
  });

  it("laisse la paire intacte quand elle est déjà dans l'ordre canonique", async () => {
    const { service, repository } = makeService();

    await service.create(
      SOURCE,
      dto(RelationType.is_correlated_with, TARGET),
      "user-1",
    );

    expect(repository.create).toHaveBeenCalledWith(
      SOURCE,
      expect.objectContaining({ applicationTargetId: TARGET }),
    );
  });

  it("refuse de corréler une application avec elle-même", async () => {
    const { service, repository } = makeService();

    await expect(
      service.create(
        SOURCE,
        dto(RelationType.is_correlated_with, SOURCE),
        "user-1",
      ),
    ).rejects.toThrow(/elle-même/);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("ne touche pas aux relations orientées, dont la direction porte le sens", async () => {
    const { service, repository } = makeService();

    // "app-b" fait partie de "app-a" : inverser la paire changerait le sens.
    await service.create(
      TARGET,
      dto(RelationType.is_part_of, SOURCE),
      "user-1",
    );

    expect(repository.create).toHaveBeenCalledWith(
      TARGET,
      expect.objectContaining({ applicationTargetId: SOURCE }),
    );
  });
});
