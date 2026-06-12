import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  OrganizationMaiaReference,
  Organization,
  Prisma,
} from "@prisma/client";
import { BaseService } from "src/common/base.service";
import { PrismaService } from "src/prisma/prisma.service";
import {
  CreateOrganizationMaiaReferenceDto,
  OrganizationMaiaReferenceFilterDto,
} from "./dto/organization-maia-references.dto";

@Injectable()
export class OrganizationMaiaReferencesService extends BaseService<
  OrganizationMaiaReference,
  Prisma.OrganizationMaiaReferenceDelegate
> {
  constructor(prisma: PrismaService) {
    super(prisma.organizationMaiaReference, prisma);
  }

  async createReference(
    data: CreateOrganizationMaiaReferenceDto,
  ): Promise<OrganizationMaiaReference> {
    await this.ensureOrganizationExists(data.organizationId);

    try {
      return await this.createRawReference({
        organizationId: data.organizationId,
        maiaRef: data.maiaRef,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `La référence MAIA « ${data.maiaRef} » est déjà associée à une organisation`,
        );
      }
      throw error;
    }
  }

  async findAllReferences(filters: OrganizationMaiaReferenceFilterDto) {
    return this.findAll({
      where: {
        organizationId: filters.organizationId,
      },
      orderBy: { maiaRef: "asc" },
      page: 0,
      pageSize: 0,
    });
  }

  async findOrganizationByMaiaRef(
    maiaRef: string,
  ): Promise<Organization | null> {
    const reference = await this.prisma.organizationMaiaReference.findUnique({
      where: { maiaRef },
      include: { organization: true },
    });
    return reference?.organization ?? null;
  }

  private async ensureOrganizationExists(
    organizationId: string,
  ): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException(`Organisation ${organizationId} non trouvée`);
    }
  }

  private createRawReference(data: {
    organizationId: string;
    maiaRef: string;
  }): Promise<OrganizationMaiaReference> {
    return super.create(data);
  }
}
