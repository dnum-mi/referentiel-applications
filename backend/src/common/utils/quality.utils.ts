import { PrismaClient } from '@prisma/client';

export async function calculateIQ(
  applicationId: string,
  prisma: PrismaClient,
): Promise<number> {
  const [application, hosting, actors, compliances] = await Promise.all([
    prisma.application.findUnique({ where: { id: applicationId } }),
    prisma.hosting.findFirst({ where: { applicationId } }),
    prisma.actor.findMany({
      where: { applicationId },
      include: { actorType: true },
    }),
    prisma.compliance.findMany({ where: { applicationId } }),
  ]);

  const rules = [
    { value: Boolean(application.description), importance: 1 },
    { value: Boolean(hosting), importance: 1 },
    { value: actors.some((a) => a.actorType?.code === 'MOA'), importance: 1 },
    { value: actors.some((a) => a.actorType?.code === 'MOE'), importance: 2 },
    { value: actors.some((a) => a.actorType?.code === 'TMA'), importance: 2 },
    { value: actors.some((a) => a.actorType?.code === 'HEB'), importance: 3 },
    { value: actors.some((a) => a.actorType?.code === 'REP'), importance: 3 },
    {
      value: compliances.some((c) => c.name.toLowerCase().includes('pdma')),
      importance: 3,
    },
    {
      value: compliances.some((c) => c.name.toLowerCase().includes('dima')),
      importance: 3,
    },
    {
      value: compliances.some((c) =>
        c.name.toLowerCase().includes('homologation'),
      ),
      importance: 3,
    },
    {
      value: compliances.some((c) => c.name.toLowerCase().includes('snapvisu')),
      importance: 3,
    },
  ];

  const noCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  rules.forEach((c) => {
    if (!c.value) noCounts[c.importance]++;
  });

  const positions = {
    1: [50, 5, 3, 1, 1],
    2: [30, 10, 5, 1, 1],
    3: [20, 15, 10, 5, 1],
  };

  const score1 = noCounts[1] > 4 ? 0 : positions[1][noCounts[1]];
  const score2 = noCounts[2] > 4 ? 0 : positions[2][noCounts[2]];
  const score3 = noCounts[3] > 4 ? 0 : positions[3][noCounts[3]];

  return score1 + score2 + score3;
}
