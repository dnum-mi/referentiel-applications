import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { createProductPowerpoint } from "./product-powerpoint";

// La fiche produit reprend uniquement les informations générales lisibles avec
// AppRead. Ni dette technique, ni contacts, ni données d'exploitation sensibles.
const productCardSelect = {
  id: true,
  label: true,
  shortName: true,
  description: true,
  purposes: true,
  targetPopulations: true,
  type: true,
  quality: true,
  currentStatus: { select: { status: true } },
  businessDivisions: { select: { label: true }, orderBy: { label: "asc" } },
  tags: { select: { name: true }, orderBy: { name: "asc" } },
  labels: { select: { value: true }, orderBy: { value: "asc" } },
} satisfies Prisma.ApplicationSelect;

export type ProductCard = Prisma.ApplicationGetPayload<{
  select: typeof productCardSelect;
}>;

@Injectable()
export class ApplicationProductExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportProductCard(applicationId: string): Promise<Buffer> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: productCardSelect,
    });
    if (!application) {
      throw new NotFoundException("Application non trouvée.");
    }
    return createProductPowerpoint(application);
  }
}
