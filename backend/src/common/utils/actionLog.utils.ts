import prisma from 'src/prisma/prisma.service';

export async function updateUserLastLogin(user: any) {
  return await prisma.user.update({
    where: { keycloakId: user.keycloakId },
    data: {
      lastLogin: new Date(),
    },
  });
}
