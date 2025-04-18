import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OrganizationFaker {
  static async create() {
    return await prisma.organization.create({
      data: {
        label: 'Test Organization',
        url: 'http://example.com',
        sigle: 'TEST',
      },
    });
  }
}
