import type { PrismaService } from "src/prisma/prisma.service";
import type { Prisma } from "@prisma/client";
import {
  ApplicationProductExportService,
  type ProductCard,
} from "./product-export.service";

const card = {
  id: "test-application",
  label: "Application",
  shortName: null,
  description: "Description",
  purposes: [],
  targetPopulations: [],
  type: null,
  quality: null,
  currentStatus: null,
  businessDivisions: [],
  labels: [],
  tags: [],
} satisfies ProductCard;

describe("Périmètre de la fiche produit dans les deux formats", () => {
  it("réutilise exactement la sélection autorisée et n'élargit pas aux contacts ou à la dette", async () => {
    const findUnique = jest.fn(
      async (query: Prisma.ApplicationFindUniqueArgs) => {
        void query;
        return card;
      },
    );
    const service = new ApplicationProductExportService({
      application: { findUnique },
    } as unknown as PrismaService);
    await service.exportProductCard(card.id);
    await service.exportProductCardToHtml(card.id);
    expect(findUnique).toHaveBeenCalledTimes(2);
    expect(findUnique.mock.calls[0]).toEqual(findUnique.mock.calls[1]);
    expect(findUnique.mock.calls[0][0].where).toEqual({ id: card.id });
    expect(findUnique.mock.calls[0][0].select).not.toHaveProperty("actors");
    expect(findUnique.mock.calls[0][0].select).not.toHaveProperty(
      "technicalDebtInfo",
    );
  });

  it("refuse une fiche absente dans les deux formats", async () => {
    const service = new ApplicationProductExportService({
      application: { findUnique: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService);
    await expect(service.exportProductCard(card.id)).rejects.toThrow(
      "Application non trouvée.",
    );
    await expect(service.exportProductCardToHtml(card.id)).rejects.toThrow(
      "Application non trouvée.",
    );
  });
});
