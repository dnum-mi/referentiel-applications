import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaginationDto } from "src/common/dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class BusinessDivisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findFirstById(id: string) {
    return await this.prisma.businessDivision.findFirst({
      where: {
        id,
      },
    });
  }

  public async findAll(
    query: {
      where: Prisma.BusinessDivisionWhereInput;
      orderBy: Prisma.BusinessDivisionOrderByWithRelationInput;
    } & Pick<PaginationDto, "page" | "pageSize">,
  ) {
    const { where, orderBy, page, pageSize } = query;

    return this.prisma.businessDivision.paginate({
      where,
      orderBy,
      page: page,
      pageSize: pageSize,
    });
  }
}
