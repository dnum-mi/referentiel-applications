import { NotFoundException } from "@nestjs/common";
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
});
