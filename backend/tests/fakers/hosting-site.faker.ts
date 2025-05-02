import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class HostingSiteFaker {
  static async create(
    overrides: Partial<{
      name: string;
      building: string;
      room: string;
      description: string;
    }> = {},
  ) {
    return await prisma.hostingSite.create({
      data: {
        name: overrides.name || `Site-${uuidv4().substring(0, 8)}`,
        building: overrides.building || `Building-${uuidv4().substring(0, 5)}`,
        room: overrides.room || `Room-${uuidv4().substring(0, 3)}`,
        description:
          overrides.description ||
          `Description for site ${uuidv4().substring(0, 8)}`,
      },
    });
  }
}
