import { getPrismaClient } from './prisma';

export class OrganizationFaker {
  static async create() {
    const prisma = getPrismaClient();

    return await prisma.organization.create({
      data: {
        label: 'Test Organization',
        url: 'http://example.com',
        sigle: 'TEST',
      },
    });
  }
}
