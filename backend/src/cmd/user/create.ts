import type { Command } from "commander";
import { PrismaClient, Roles } from "@prisma/client";
import { Option } from "commander";
import { typeguardIncludes } from "src/utils/typeguard-includes";

const prisma = new PrismaClient();

export function userCreateCommand(program: Command): void {
  program
    .command("create")
    .description("Create a new user")
    .addOption(
      new Option(
        "-e, --email <email>",
        "Email of the user",
      ).makeOptionMandatory(),
    )
    .addOption(
      new Option(
        "-a, --admin-level <level>",
        "Role of the user",
      ).makeOptionMandatory(),
    )
    .action(createUser);
}

async function createUser(options: { email: string; role: string }) {
  const role = options.role;
  if (
    !typeguardIncludes(role, [
      Roles.ADMIN,
      Roles.CONTRIBUTOR,
      Roles.READER,
      Roles.VISITOR,
    ])
  ) {
    console.error("role arg must be Roles enum");
    process.exit(1);
  }

  // #2501 : e-mails stockés en minuscules.
  const email = options.email.trim().toLowerCase();
  await prisma.user
    .upsert({
      where: { email },
      update: { role },
      create: {
        email,
        role,
      },
    })
    .then((user) => {
      console.log("User created:", user);
    })
    .catch((error) => {
      console.error("Error creating user:", error);
    });
}
