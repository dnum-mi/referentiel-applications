import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Global')
@Controller('global-search')
export class GlobalSearchController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async search(@Query('query') query: string) {
    const take = 10;

    // const filter = {
    //   contains: query,
    //   mode: 'insensitive',
    // } as any;

    const [applications, capabilities, urbanzones] =
      await this.prisma.$transaction([
        this.prisma.appApplication.findMany({
          take,
          include: { orgOrganisationunit: true },
          orderBy: {
            _relevance: {
              fields: ['longname', 'description'],
              search: query,
              sort: 'desc',
            },
          },
        }),
        this.prisma.fctCapability.findMany({
          take,
          orderBy: {
            _relevance: {
              fields: ['label', 'description'],
              search: query,
              sort: 'desc',
            },
          },
        }),
        this.prisma.fctUrbanzone.findMany({
          take,
          orderBy: {
            _relevance: {
              fields: ['label', 'description'],
              search: query,
              sort: 'desc',
            },
          },
        }),
      ]);

    return { applications, capabilities, urbanzones };
  }
}
