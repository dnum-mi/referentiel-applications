import type { UserFakerReturnType } from "./user.faker";
import { getPrismaClient } from "./prisma";

export class LinkFaker {
  static async create(application, user: UserFakerReturnType) {
    const prisma = getPrismaClient();

    return await prisma.externalRessource.create({
      data: {
        type: "documentation",
        link: "https://example.com",
        description: "Example link",
        application: {
          connect: {
            id: application.id,
          },
        },
        metadatas: {
          create: {
            applicationId: application.id,
            createdById: user.id,
          },
        },
      },
    });
  }
}
