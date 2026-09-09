import type { Status } from "@prisma/client";
import type { AsyncReturnType } from "src/utils/types.util";
import type { UserFaker } from "./user.faker";
import { faker } from "@faker-js/faker";
import { ApplicationType, priorityRestart } from "@prisma/client";
import { getPrismaClient } from "./prisma";

const restartPriorities = Object.values(priorityRestart);
const applicationTypes = Object.values(ApplicationType);
interface ApplicationFakerOverrides {
  label?: string;
  shortName?: string;
}

export class ApplicationFaker {
  static async create(
    user: AsyncReturnType<typeof UserFaker.create>,
    { label, shortName }: ApplicationFakerOverrides = {},
  ) {
    const prisma = getPrismaClient();

    // Create application first
    const initialStatus: Status = "under_construction";
    const application = await prisma.application.create({
      data: {
        label: label ?? faker.company.name(),
        shortName: shortName ?? faker.company.name(),
        description: faker.company.catchPhrase(),
        priorityRestart: faker.helpers.arrayElement(restartPriorities),
        type: faker.helpers.maybe(
          () => faker.helpers.arrayElement(applicationTypes),
          { probability: 0.5 },
        ),
        metadatas: {
          create: [
            {
              createdById: user.id,
            },
          ],
        },
        quality: faker.number.int({ min: 10, max: 100 }),
      },
    });

    // Create initial status
    const statusRecord = await prisma.applicationStatus.create({
      data: {
        applicationId: application.id,
        status: initialStatus,
        statusDate:
          faker.helpers.maybe(() => faker.date.past({ years: 1 }), {
            probability: 0.4,
          }) || undefined,
      },
    });

    // Then set currentStatusId to the created status
    const updatedApp = await prisma.application.update({
      where: { id: application.id },
      data: { currentStatusId: statusRecord.id },
    });

    return updatedApp;
  }

  static async delete(applicationId: string) {
    const prisma = getPrismaClient();
    return prisma.application.delete({ where: { id: applicationId } });
  }
}
