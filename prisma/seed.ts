import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  // await prisma.appStatus.createMany({
  //   data: [
  //     { applicationstatuscode: 'BLD', label: 'En construction' },
  //     { applicationstatuscode: 'PRD', label: 'En production' },
  //     { applicationstatuscode: 'RTR', label: 'Retirée du service' },
  //     { applicationstatuscode: 'DCS', label: 'Décommissionnée' },
  //   ],
  //   skipDuplicates: true,
  // });
  // await prisma.appType.createMany({
  //   data: [
  //     { applicationtypecode: 'WBEXT', label: 'Site de communication Internet' },
  //     { applicationtypecode: 'WBINT', label: 'Site de communication Intranet' },
  //     { applicationtypecode: 'SVBUS', label: 'Service métier' },
  //     { applicationtypecode: 'SVTRA', label: 'Service transverse' },
  //     { applicationtypecode: 'SVSCL', label: 'Service socle' },
  //   ],
  //   skipDuplicates: true,
  // });

  // await prisma.refSensitivity.createMany({
  //   data: [
  //     { sensitivitycode: 'S1', label: 'Standard' },
  //     { sensitivitycode: 'S2', label: 'Sensible' },
  //     { sensitivitycode: 'S3', label: 'Essentiel' },
  //     { sensitivitycode: 'S4', label: 'Importance vitale' },
  //   ],
  //   skipDuplicates: true,
  // });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
