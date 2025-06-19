import { Injectable } from '@nestjs/common';
import prisma from 'src/prisma/prisma.service';
import { BaseService } from '../common/base.service';
import { Link } from './entities/link.entity';
import { MetadatasService } from 'src/metadatas/metadatas.service';

@Injectable()
export class LinksService extends BaseService<Link> {
  constructor(metadatasService: MetadatasService) {
    super(prisma.externalRessource, prisma, metadatasService);
  }
}
