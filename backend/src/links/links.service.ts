import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { Link } from './entities/link.entity';
import { MetadatasService } from 'src/metadatas/metadatas.service';
import { ApplicationService } from 'src/product/application.service';

@Injectable()
export class LinksService extends BaseService<Link> {
  constructor(
    prisma: PrismaService,
    metadatasService: MetadatasService,
    applicationService: ApplicationService,
  ) {
    super(
      prisma.externalRessource,
      prisma,
      metadatasService,
      applicationService,
    );
  }
}
