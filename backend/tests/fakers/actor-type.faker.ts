import type { APP_PERMISSIONS } from "src/common/utils/types";
import { faker } from "@faker-js/faker";
import { getPrismaClient } from "./prisma";

function permissionsToObject(
  permissions: Set<APP_PERMISSIONS>,
): Record<APP_PERMISSIONS, boolean> {
  return {
    ActorRead: permissions.has("ActorRead"),
    ActorWrite: permissions.has("ActorWrite"),
    ComplianceRead: permissions.has("ComplianceRead"),
    ComplianceWrite: permissions.has("ComplianceWrite"),
    HostingRead: permissions.has("HostingRead"),
    HostingWrite: permissions.has("HostingWrite"),
    MetadataRead: permissions.has("MetadataRead"),
    DataRead: permissions.has("DataRead"),
    RelationRead: permissions.has("RelationRead"),
    RelationWrite: permissions.has("RelationWrite"),
    LinkRead: permissions.has("LinkRead"),
    LinkWrite: permissions.has("LinkWrite"),
    AppRead: permissions.has("AppRead"),
    AppWrite: permissions.has("AppWrite"),
    AppWritePriority: permissions.has("AppWritePriority"),
    ReportRead: permissions.has("ReportRead"),
    ReportPost: permissions.has("ReportPost"),
    ReportManage: permissions.has("ReportManage"),
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
      .replace(/\b\w/g, (c) => c.toUpperCase());
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
