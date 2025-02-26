import { exec } from 'child_process';
import { PrismaClient } from '@prisma/client';

const testDbName = 'test';
const testDatabaseUrl = `postgresql://postgres:password@postgres:5432/${testDbName}`;

export async function createTestDatabase() {
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(`CREATE DATABASE ${testDbName};`);
  console.log(`Test database ${testDbName} created.`);

  process.env.DATABASE_URL = testDatabaseUrl;
  console.log(`DATABASE_URL set to ${testDatabaseUrl}`);

  await prisma.$connect();
  await prisma.$disconnect();
}

export async function deleteTestDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://postgres:password@postgres:5432/postgres`,
      },
    },
  });
  await prisma.$executeRawUnsafe(`DROP DATABASE ${testDbName};`);
  await prisma.$disconnect();
}

export async function applyMigrations() {
  return new Promise((resolve, reject) => {
    exec('npx prisma migrate deploy', (error, stdout, stderr) => {
      if (error) {
        console.error('Error running migrations:', stderr);
        return reject(error);
      }
      console.log(stdout);
      resolve(stdout);
    });
  });
}
