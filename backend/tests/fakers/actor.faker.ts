import { getPrismaClient } from "./prisma";

export class ActorFaker {
  static async link(actor: {
    userEmail: string
    actorTypeId: string
    applicationId: string
  }) {
    const prisma = getPrismaClient();
    const newActor = await prisma.actor.create({
      data: {
        actorTypeId: actor.actorTypeId,
        email: actor.userEmail,
        firstname: "Test",
        lastname: "User",
        applicationId: actor.applicationId,
      },
    });
    return {
      ...newActor,
      delete: async () => {
        await prisma.actor.delete({
          where: { id: newActor.id },
        });
      },
    };
  }
}
