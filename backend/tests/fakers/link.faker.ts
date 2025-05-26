import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LinkFaker {
  static async create(application, user) {
    return await prisma.externalRessource.create({
      data: {
        type: 'documentation',
        link: 'https://example.com',
        description: 'Example link',
        application: {
          connect: {
            id: application.id,
          },
        },
        metadatas: {
          create: {
            createdById: user.id,
            application: {
              connect: { id: application.id },
            },
          },
        },
      },
    });
  }
}
