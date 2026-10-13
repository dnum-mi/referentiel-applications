import { Test } from "@nestjs/testing";
import { EmailService } from "src/email/email.service";
import { decryptGristApiKey } from "src/grist/grist-api-key";
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

describe("UserService — clé d'API Grist", () => {
  const previous = process.env.GRIST_ENCRYPTION_KEY;
  beforeEach(() => (process.env.GRIST_ENCRYPTION_KEY = "secret-de-test"));
  afterAll(() => (process.env.GRIST_ENCRYPTION_KEY = previous));

  async function setup() {
    const update = jest.fn().mockResolvedValue({});
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: { user: { update } } },
        { provide: UserPermissionLogService, useValue: {} },
        { provide: OrganizationMaiaReferencesService, useValue: {} },
        { provide: ScopedPermissionService, useValue: {} },
        { provide: LoggerService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();
    const savedKey = () => update.mock.calls[0][0].data.gristApiKey;
    return { sut: module.get(UserService), savedKey };
  }

  it("enregistre la clé chiffrée, jamais en clair", async () => {
    const { sut, savedKey } = await setup();
    await sut.updateOwnPreferences("u1", { gristApiKey: "cle-api-grist" });

    expect(savedKey()).not.toContain("cle-api-grist");
    expect(decryptGristApiKey(savedKey())).toBe("cle-api-grist");
  });

  it.each([
    ["efface la clé avec null", null, null],
    ["laisse la clé inchangée sans valeur", undefined, undefined],
  ])("%s", async (_, gristApiKey, expected) => {
    const { sut, savedKey } = await setup();
    await sut.updateOwnPreferences("u1", { gristApiKey });

    expect(savedKey()).toBe(expected);
  });
});
