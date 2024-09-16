import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Global')
@Controller('global-search')
export class GlobalSearchController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Recherche globale',
    description:
      'Effectue une recherche dans les applications, capacités et zones urbaines en fonction du terme de recherche fourni.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recherche effectuée avec succès.',
    type: Object,
  })
  @ApiResponse({ status: 400, description: 'Requête invalide.' })
  @ApiResponse({ status: 500, description: 'Erreur interne du serveur.' })
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
