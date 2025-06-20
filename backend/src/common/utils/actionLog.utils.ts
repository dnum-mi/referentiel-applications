import { PrismaService } from 'src/prisma/prisma.service';

const prisma: PrismaService = new PrismaService();

export async function updateUserLastLogin(user: any) {
  return await prisma.user.update({
    where: { keycloakId: user.keycloakId },
    data: {
      lastLogin: new Date(),
    },
  });
}
