import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { PrismaService } from "src/prisma/prisma.service";
import { SavedFilterService } from "./saved-filter.service";

describe("SavedFilterService", () => {
  it("lists a user's saved filters ordered by creation date", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new SavedFilterService({
      savedFilter: { findMany },
    } as unknown as PrismaService);

    await service.findAllForUser("user-1");

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "asc" },
    });
  });

  it("upserts by (userId, name) so saving under an existing name overwrites it", async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const service = new SavedFilterService({
      savedFilter: { upsert },
    } as unknown as PrismaService);

    await service.upsert("user-1", {
      name: "Mes applis critiques",
      filters: { priorityRestart: ["high"] },
    });

    expect(upsert).toHaveBeenCalledWith({
      where: {
        userId_name: { userId: "user-1", name: "Mes applis critiques" },
      },
      create: {
        userId: "user-1",
        name: "Mes applis critiques",
        filters: { priorityRestart: ["high"] },
      },
      update: {
        filters: { priorityRestart: ["high"] },
      },
    });
  });

  it("deletes a saved filter scoped to its owner", async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = new SavedFilterService({
      savedFilter: { deleteMany },
    } as unknown as PrismaService);

    await service.delete("user-1", "filter-1");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "filter-1", userId: "user-1" },
    });
  });

  it("throws NotFoundException when deleting a filter owned by another user or missing", async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const service = new SavedFilterService({
      savedFilter: { deleteMany },
    } as unknown as PrismaService);

    await expect(service.delete("user-1", "filter-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("renames only the name, scoped atomically to the owner", async () => {
    const filters = { search: "A", tag: ["x,y"], nested: { enabled: true } };
    const update = jest
      .fn()
      .mockResolvedValue({ id: "filter-1", name: "Renommé", filters });
    const service = new SavedFilterService({
      savedFilter: { update },
    } as unknown as PrismaService);
    await expect(
      service.rename("user-1", "filter-1", " Renommé "),
    ).resolves.toMatchObject({ filters });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { id: "filter-1", userId: "user-1" },
      data: { name: "Renommé" },
    });
  });

  it.each(["", "   ", "a".repeat(101)])(
    "rejects an invalid name without writing: %j",
    async (name) => {
      const update = jest.fn();
      const service = new SavedFilterService({
        savedFilter: { update },
      } as unknown as PrismaService);
      await expect(
        service.rename("user-1", "filter-1", name),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(update).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["P2002", ConflictException],
    ["P2025", NotFoundException],
  ] as const)("maps the atomic write refusal %s", async (code, exception) => {
    const update = jest.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("refused", {
        code,
        clientVersion: "6.19.3",
      }),
    );
    const service = new SavedFilterService({
      savedFilter: { update },
    } as unknown as PrismaService);
    await expect(
      service.rename("user-1", "filter-1", "Renommé"),
    ).rejects.toBeInstanceOf(exception);
  });

  it("preserves an unexpected database failure", async () => {
    const error = new Error("Database unavailable");
    const update = jest.fn().mockRejectedValue(error);
    const service = new SavedFilterService({
      savedFilter: { update },
    } as unknown as PrismaService);
    await expect(service.rename("user-1", "filter-1", "Renommé")).rejects.toBe(
      error,
    );
  });
});
