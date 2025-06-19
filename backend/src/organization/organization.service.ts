import { Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { BaseService } from '../common/base.service';
import prisma from 'src/prisma/prisma.service';

@Injectable()
export class OrganizationService extends BaseService<Organization> {
  constructor() {
    super(prisma.organization, prisma);
  }
}
