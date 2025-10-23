import type { Command } from "commander";
import { PrismaClient } from "@prisma/client";
import { Option } from "commander";

const prisma = new PrismaClient();

export function userCreateCommand(program: Command): void {
  program
    .command("create")
    .description("Create a new user")
    .addOption(new Option("-e, --email <email>", "Email of the user").makeOptionMandatory())
    .addOption(new Option("-a, --admin-level <level>", "Admin level of the user").makeOptionMandatory())
    .action(createUser);
}

async function createUser(options: { email: string, adminLevel: string }) {
  const adminLevelInt = Number.parseInt(options.adminLevel, 10);
  if (Number.isNaN(adminLevelInt)) {
    console.error("Admin level must be a number");
    process.exit(1);
  }
  await prisma.user.upsert({
    where: { email: options.email },
    update: { adminLevel: adminLevelInt },
    create: {
      email: options.email,
      adminLevel: adminLevelInt,
    },
  }).then((user) => {
    console.log("User created:", user);
  }).catch((error) => {
    console.error("Error creating user:", error);
  });
}
