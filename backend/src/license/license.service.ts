import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BaseService } from "src/common/base.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateLicenseDto } from "./dto/license.dto";
import { License } from "./entities/license.entity";
import { ServiceOptions } from "src/common/utils/types";
import { ApplicationService } from "src/applications/application.service";

@Injectable()
export class LicenseService extends BaseService<License> {
  constructor(
    readonly prisma: PrismaService,
    metadataService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(prisma.license, prisma, metadataService, applicationService);
  }

  async findAllByApplicationId(applicationId: string): Promise<License[]> {
    return this.prisma.license.findMany({
      where: { applicationId },
      orderBy: { name: "asc" },
    }) as unknown as Promise<License[]>;
  }

  async createLicense(
    applicationId: string,
    dto: CreateLicenseDto,
    options?: ServiceOptions<License>,
  ): Promise<License> {
    const applicationExists = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    if (!applicationExists) {
      throw new NotFoundException(
        "Application introuvable pour cet identifiant",
      );
    }

    const existing = await this.prisma.license.findUnique({
      where: {
        applicationId_name: {
          applicationId,
          name: dto.name,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        "Cette licence est déjà renseignée pour cette application",
      );
    }

    return super.create({ ...dto, applicationId }, options);
  }

  async updateLicense(
    id: string,
    applicationId: string,
    dto: Partial<CreateLicenseDto>,
    options?: ServiceOptions<License>,
  ): Promise<License> {
    const existing = await this.prisma.license.findUnique({
      where: { id },
    });
    if (existing?.applicationId !== applicationId) {
      throw new NotFoundException("Licence introuvable");
    }

    if (dto.name && dto.name !== existing.name) {
      const conflict = await this.prisma.license.findUnique({
        where: {
          applicationId_name: {
            applicationId,
            name: dto.name,
          },
        },
      });
      if (conflict) {
        throw new ConflictException(
          "Cette licence est déjà renseignée pour cette application",
        );
      }
    }

    return super.update(id, dto, options);
  }

  async deleteLicense(
    id: string,
    applicationId: string,
    options?: ServiceOptions<License>,
  ): Promise<void> {
    const existing = await this.prisma.license.findUnique({
      where: { id },
    });
    if (existing?.applicationId !== applicationId) {
      throw new NotFoundException("Licence introuvable");
    }
    await super.delete(id, options);
  }
}
