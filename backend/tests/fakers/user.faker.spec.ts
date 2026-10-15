import { Permission, Roles } from "@prisma/client";
import { getPrismaClient } from "./prisma";
import { UserFaker } from "./user.faker";

// Les adresses Faker ne sont pas uniques : cette collision faisait hériter
// une fixture VISITOR du compte ADMIN créé plus tôt dans la base partagée.
jest.mock("@faker-js/faker", () => ({
  faker: { internet: { email: () => "same-generated-email@example.test" } },
}));
jest.mock("./prisma", () => ({ getPrismaClient: jest.fn() }));

describe("UserFaker — isolation des identités", () => {
  type User = {
    id: string;
    email: string;
    role: Roles;
    additionalPermissions: Permission[];
  };
  const users = new Map<string, User>();
  const prisma = {
    user: {
      findUnique: jest.fn(
        async ({ where }: { where: { email: string } }) =>
          users.get(where.email) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Omit<User, "id"> }) => {
        const user = { id: `user-${users.size}`, ...data };
        users.set(user.email, user);
        return user;
      }),
    },
  };

  beforeEach(() => {
    users.clear();
    jest.clearAllMocks();
    jest
      .mocked(getPrismaClient)
      .mockReturnValue(prisma as unknown as ReturnType<typeof getPrismaClient>);
  });

  it("crée des identités distinctes avec leurs propres droits même si Faker produit la même adresse", async () => {
    const admin = await UserFaker.create({
      role: Roles.ADMIN,
      additionalPermissions: [Permission.DataExport],
    });
    const visitor = await UserFaker.create({ role: Roles.VISITOR });

    expect(visitor.role).toBe(Roles.VISITOR);
    expect(visitor.additionalPermissions).toEqual([]);
    expect(visitor.id).not.toBe(admin.id);
    expect(visitor.email.toLowerCase()).not.toBe(admin.email.toLowerCase());
    expect(admin.role).toBe(Roles.ADMIN);
    expect(admin.additionalPermissions).toEqual([Permission.DataExport]);
    expect(prisma.user.create).toHaveBeenCalledTimes(2);
  });

  it("conserve la réutilisation volontaire d'une adresse explicitement fournie", async () => {
    const email = "explicit-user@example.test";
    const existing = await UserFaker.create({ email, role: Roles.ADMIN });
    const reused = await UserFaker.create({ email, role: Roles.VISITOR });

    expect(reused.id).toBe(existing.id);
    expect(reused.role).toBe(Roles.ADMIN);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});
