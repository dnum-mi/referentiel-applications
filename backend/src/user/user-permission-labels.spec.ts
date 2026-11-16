import { Test } from "@nestjs/testing";
import { EmailService } from "src/email/email.service";
import { LoggerService } from "src/logger/logger.service";
import { NotificationService } from "src/notification/notification.service";
import { OrganizationMaiaReferencesService } from "src/organization-maia-references/organization-maia-references.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ScopedPermissionService } from "./scope-permission/scoped-permission.service";
import { UserPermissionLogService } from "./user-permission-log.service";
import { UserService } from "./user.service";

jest.mock(
  "src/organization-maia-references/organization-maia-references.service",
  () => ({ OrganizationMaiaReferencesService: jest.fn() }),
);
jest.mock("src/email/email.service", () => ({ EmailService: jest.fn() }));
jest.mock("./user-permission-log.service", () => ({
  UserPermissionLogService: jest.fn(),
}));

import { Permission, Roles, NotificationType } from "@prisma/client";
import { Requestor } from "./entities/user.entity";

describe("Notifications de changement de droits", () => {
  it.each([
    [
      [Permission.DataExport, Permission.BetaFeatures],
      "Exporter les données, Accéder aux fonctionnalités bêta",
    ],
    [[], "aucune"],
  ])(
    "traduit les rôles et permissions %j",
    async (additionalPermissions, expected) => {
      const previous = {
        id: "user",
        email: "user@example.com",
        role: Roles.VISITOR,
        organizationId: null,
        additionalPermissions: [Permission.AppList],
      };
      const updated = {
        ...previous,
        role: Roles.READER,
        additionalPermissions,
      };
      const create = jest.fn();
      const module = await Test.createTestingModule({
        providers: [
          UserService,
          {
            provide: PrismaService,
            useValue: {
              user: {
                findUnique: jest.fn().mockResolvedValue(previous),
                update: jest.fn().mockResolvedValue(updated),
              },
            },
          },
          { provide: UserPermissionLogService, useValue: { log: jest.fn() } },
          { provide: OrganizationMaiaReferencesService, useValue: {} },
          {
            provide: ScopedPermissionService,
            useValue: { assertCanUpdate: jest.fn() },
          },
          { provide: LoggerService, useValue: { log: jest.fn() } },
          {
            provide: EmailService,
            useValue: { sendUserPermissionsChangedNotification: jest.fn() },
          },
          { provide: NotificationService, useValue: { create } },
        ],
      }).compile();
      const requestor = new Requestor();
      requestor.id = "admin";
      requestor.email = "admin@example.com";
      await module.get(UserService).update(
        "user",
        {
          role: Roles.READER,
          organizationId: null,
          scopeOrganizationId: null,
          additionalPermissions,
        },
        requestor,
      );
      expect(create).toHaveBeenCalledWith(
        "user",
        NotificationType.user_permissions_changed,
        `Vos droits d'accès ont été modifiés (rôle : Utilisateur → Lecture totale ; permissions supplémentaires : ${expected}).`,
        { link: "/profil", emailLogId: undefined },
      );
      await module.close();
    },
  );
});
