import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { IMetadataRepository } from "./metadata.repository.interface";

@Injectable()
export class MetadataRepository implements IMetadataRepository {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  public async findAll(applicationId?: string) {
    return this.prisma.metadata.findMany({
      where: applicationId ? { applicationId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: true,
        application: {
          select: { id: true, label: true },
        },
      },
    });
  }

  async findFirstAndLastByApplicationId(applicationId: string) {
    const [first, last] = await this.prisma.$transaction([
      this.prisma.metadata.findFirst({
        where: { applicationId },
        orderBy: { createdAt: "asc" },
        include: { createdBy: true },
      }),
      this.prisma.metadata.findFirst({
        where: { applicationId },
        orderBy: { createdAt: "desc" },
        include: { createdBy: true },
      }),
    ]);

    return { first, last };
  }
}
