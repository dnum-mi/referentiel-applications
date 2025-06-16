import { prisma } from './prisma';

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
