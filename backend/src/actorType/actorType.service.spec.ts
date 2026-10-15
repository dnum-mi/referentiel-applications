import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { ActorTypeService } from "./actorType.service";

describe("ActorTypeService — suppression concurrente", () => {
  function restrictionError(
    constraint = "Actor_actorTypeId_fkey",
    code = "23001",
  ) {
    const message = `update or delete on table "ActorType" violates RESTRICT setting of foreign key constraint "${constraint}" on table "Actor"`;
    return new Prisma.PrismaClientUnknownRequestError(
      `ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { code: "${code}", message: ${JSON.stringify(message)}, severity: "ERROR" }), transient: false })`,
      { clientVersion: Prisma.prismaVersion.client },
    );
  }

  function serviceRejectingDelete(error: Error) {
    const prisma = {
      actorType: {
        findUnique: jest.fn().mockResolvedValue({
          id: "actor-type",
          label: "Type temporaire",
          isDefault: false,
        }),
        delete: jest.fn().mockRejectedValue(error),
      },
      // La vérification précède le rattachement concurrent couvert par la FK.
      actor: { count: jest.fn().mockResolvedValue(0) },
    };
    return new ActorTypeService(prisma as unknown as PrismaService);
  }

  it("renvoie 409 quand la clé étrangère refuse la suppression après le contrôle", async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      "Foreign key constraint violated",
      { code: "P2003", clientVersion: Prisma.prismaVersion.client },
    );

    await expect(
      serviceRejectingDelete(error).delete("actor-type"),
    ).rejects.toThrow(ConflictException);
  });

  it("renvoie aussi 409 pour le refus RESTRICT de PostgreSQL 18 non normalisé par Prisma", async () => {
    await expect(
      serviceRejectingDelete(restrictionError()).delete("actor-type"),
    ).rejects.toThrow(ConflictException);
  });

  it.each([
    new Error("Database unavailable"),
    new Prisma.PrismaClientKnownRequestError("Record disappeared", {
      code: "P2025",
      clientVersion: Prisma.prismaVersion.client,
    }),
    restrictionError("Another_actorTypeId_fkey"),
    restrictionError("Actor_actorTypeId_fkey_other"),
    restrictionError("Actor_actorTypeId_fkey", "23505"),
    new Prisma.PrismaClientUnknownRequestError("Database unavailable", {
      clientVersion: Prisma.prismaVersion.client,
    }),
    new Error(restrictionError().message),
  ])(
    "ne transforme pas une autre erreur de suppression (%s)",
    async (error) => {
      await expect(
        serviceRejectingDelete(error).delete("actor-type"),
      ).rejects.toBe(error);
    },
  );
});
