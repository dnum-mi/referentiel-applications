import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";
import type { APP_PERMISSIONS } from "src/common/utils/types";

function permissionsToObject(permissions: Set<APP_PERMISSIONS>): Record<APP_PERMISSIONS, boolean> {
  return {
    readActors: permissions.has("readActors"),
    writeActors: permissions.has("writeActors"),
    readCompliances: permissions.has("readCompliances"),
    writeCompliances: permissions.has("writeCompliances"),
    readHostings: permissions.has("readHostings"),
    writeHostings: permissions.has("writeHostings"),
    readMetadata: permissions.has("readMetadata"),
    readRelations: permissions.has("readRelations"),
    writeRelations: permissions.has("writeRelations"),
    readLinks: permissions.has("readLinks"),
    writeLinks: permissions.has("writeLinks"),
    readBase: permissions.has("readBase"),
    writeBase: permissions.has("writeBase"),
    readAnomalyNotifications: permissions.has("readAnomalyNotifications"),
    postAnomalyNotifications: permissions.has("postAnomalyNotifications"),
    manageAnomalyNotifications: permissions.has("manageAnomalyNotifications"),
  };
}
export class ActorTypeFaker {
  private static id: string;
  private static permissions: Set<APP_PERMISSIONS> = new Set();

  static async create(permissions: APP_PERMISSIONS[] = []) {
    this.permissions = new Set(permissions);
    const prisma = getPrismaClient();
    // obtain a random label and transform to title case
    const label = faker.company
      .buzzPhrase()
      .replace(/\b\w/g, c => c.toUpperCase());
    const code = label
      .replace(/[a-z\s]+/g, "")
      .toUpperCase()
      .slice(0, 5);
    const actorType = await prisma.actorType.create({
      data: {
        id: faker.string.uuid(),
        label,
        description: faker.lorem.sentence(),
        code,
        appPermissions: {
          create: permissionsToObject(this.permissions),
        }, // Convert array to comma-separated string
      },
    });
    if (!actorType) {
      throw new Error("Actor type creation failed");
    }
    this.id = actorType.id;
    return {
      ...actorType,
      permissions,
      delete: this.delete,
      update: this.update,
    };
  }

  static async update(
    appPermissions: APP_PERMISSIONS[],
    options: { reset?: boolean } = { reset: false },
  ) {
    this.permissions = new Set([
      ...appPermissions,
      ...(options.reset ? [] : this.permissions),
    ]);
    const prisma = getPrismaClient();
    const actorType = await prisma.appPermissions.update({
      where: { actorTypeId: this.id },
      data: permissionsToObject(this.permissions),
    });
    if (!actorType) {
      throw new Error("Actor type update failed");
    }
    return actorType;
  }

  static async delete() {
    const prisma = getPrismaClient();
    return prisma.actorType.delete({ where: { id: this.id } });
  }
}
