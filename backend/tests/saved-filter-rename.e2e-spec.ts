import { randomUUID } from "node:crypto";
import { ConflictException, NotFoundException } from "@nestjs/common";
import request from "supertest";
import type { PrismaService } from "src/prisma/prisma.service";
import { SavedFilterService } from "src/saved-filter/saved-filter.service";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("SavedFilterService rename — PostgreSQL (#3095)", () => {
  const app = setupTestSuite();
  const prisma = getPrismaClient();
  const service = new SavedFilterService(prisma as unknown as PrismaService);
  const createdUserIds: string[] = [];
  let ownerId: string;
  let otherId: string;
  let filterId: string;
  let ownerEmail: string;
  let otherEmail: string;
  const criteria = {
    search: "A",
    tag: ["a,b", "c"],
    technologyEolStatus: "eol",
    nested: { retained: true },
  };

  beforeEach(async () => {
    const owner = await prisma.user.create({
      data: {
        email: `${randomUUID()}@example.test`,
        additionalPermissions: [],
      },
    });
    createdUserIds.push(owner.id);
    const other = await prisma.user.create({
      data: {
        email: `${randomUUID()}@example.test`,
        additionalPermissions: [],
      },
    });
    createdUserIds.push(other.id);
    ownerId = owner.id;
    otherId = other.id;
    ownerEmail = owner.email;
    otherEmail = other.email;
    const filter = await prisma.savedFilter.create({
      data: { userId: ownerId, name: "A", filters: criteria },
    });
    filterId = filter.id;
  });
  afterEach(async () => {
    const ids = createdUserIds.splice(0);
    await prisma.actionLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.userPermissionLog.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.userConnexionLog.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: ids } },
    });
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("authenticates PATCH and returns the renamed filter without changing criteria", async () => {
    await request(app().getHttpServer())
      .patch(`/saved-filters/${filterId}`)
      .send({ name: "Nouveau" })
      .expect(401);
    const response = await request(app().getHttpServer())
      .patch(`/saved-filters/${filterId}`)
      .set("Authorization", `Bearer ${getToken({ email: ownerEmail })}`)
      .send({ name: " Nouveau " })
      .expect(200);
    expect(response.body).toMatchObject({
      id: filterId,
      name: "Nouveau",
      filters: criteria,
    });
  });

  it("rejects PATCH criteria and another owner's id through the HTTP contract", async () => {
    await request(app().getHttpServer())
      .patch(`/saved-filters/${filterId}`)
      .set("Authorization", `Bearer ${getToken({ email: ownerEmail })}`)
      .send({ name: "Nouveau", filters: { search: "B" } })
      .expect(400);
    await request(app().getHttpServer())
      .patch(`/saved-filters/${filterId}`)
      .set("Authorization", `Bearer ${getToken({ email: otherEmail })}`)
      .send({ name: "Intrusion" })
      .expect(404);
    expect(
      await prisma.savedFilter.findUniqueOrThrow({ where: { id: filterId } }),
    ).toMatchObject({ name: "A", filters: criteria });
  });

  it("keeps criteria and creation date exactly, including an unchanged name", async () => {
    const before = await prisma.savedFilter.findUniqueOrThrow({
      where: { id: filterId },
    });
    expect(await service.rename(ownerId, filterId, "A")).toEqual(before);
    expect(await service.rename(ownerId, filterId, "Nouveau")).toEqual({
      ...before,
      name: "Nouveau",
    });
    expect(
      await prisma.savedFilter.findUniqueOrThrow({ where: { id: filterId } }),
    ).toEqual({ ...before, name: "Nouveau" });
  });
  it("does not reveal or rename another user's filter", async () => {
    const before = await prisma.savedFilter.findUniqueOrThrow({
      where: { id: filterId },
    });
    await expect(
      service.rename(otherId, filterId, "Intrusion"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(
      await prisma.savedFilter.findUniqueOrThrow({ where: { id: filterId } }),
    ).toEqual(before);
  });
  it("does not overwrite a personal filter with an existing name", async () => {
    const existing = await prisma.savedFilter.create({
      data: {
        userId: ownerId,
        name: "Pris",
        filters: { search: "autres critères" },
      },
    });
    const before = await prisma.savedFilter.findUniqueOrThrow({
      where: { id: filterId },
    });
    await expect(
      service.rename(ownerId, filterId, existing.name),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      await prisma.savedFilter.findUniqueOrThrow({ where: { id: filterId } }),
    ).toEqual(before);
    expect(
      await prisma.savedFilter.findUniqueOrThrow({
        where: { id: existing.id },
      }),
    ).toEqual(existing);
  });
  it("allows the same name in another user's personal list", async () => {
    await prisma.savedFilter.create({
      data: { userId: otherId, name: "Partagé", filters: {} },
    });
    await expect(
      service.rename(ownerId, filterId, "Partagé"),
    ).resolves.toMatchObject({ name: "Partagé", filters: criteria });
  });
  it("allows only one concurrent rename to a shared target name without replacing criteria", async () => {
    const second = await prisma.savedFilter.create({
      data: { userId: ownerId, name: "B", filters: { search: "B" } },
    });
    const results = await Promise.allSettled([
      service.rename(ownerId, filterId, "Conflit"),
      service.rename(ownerId, second.id, "Conflit"),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(
      ConflictException,
    );
    const rows = await prisma.savedFilter.findMany({
      where: { userId: ownerId },
    });
    expect(rows.filter((row) => row.name === "Conflit")).toHaveLength(1);
    expect(rows.find((row) => row.id === filterId)?.filters).toEqual(criteria);
    expect(rows.find((row) => row.id === second.id)?.filters).toEqual(
      second.filters,
    );
  });
});
