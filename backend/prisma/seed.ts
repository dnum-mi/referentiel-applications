import { PrismaClient } from "@prisma/client";
import { ApplicationFaker } from "../tests/fakers/application.faker";
import { UserFaker } from "../tests/fakers/user.faker";
import { OrganizationFaker } from "../tests/fakers/organization.faker";
import { ActorFaker } from "../tests/fakers/actor.faker";
import { TagFaker } from "../tests/fakers/tag.faker";
import { HostingOptionFaker } from "../tests/fakers/hosting-option.faker";
import { HostingFaker } from "../tests/fakers/hosting.faker";
import { TechnicalDebtInfoFaker } from "../tests/fakers/technical-debt-info.faker";
import { ComplianceFaker } from "../tests/fakers/compliance.faker";
import { AdminLevel } from "src/user/entities/user.entity";
import { BusinessDivisionFaker } from "tests/fakers/business-division.faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create test users
  console.log("👤 Creating test users...");
  const adminUser = await UserFaker.create({
    email: "admin@example.com",
    adminLevel: AdminLevel.ADMIN,
  });
  const regularUser = await UserFaker.create({
    email: "user@example.com",
    adminLevel: AdminLevel.READ,
  });

  // Create organizations
  console.log("🏢 Creating test organizations...");
  for (let i = 0; i < 50; i++) {
    await OrganizationFaker.create();
  }

  // Use existing actor types created by migrations
  console.log("🎭 Using existing actor types...");
  const actorTypeMoa = await prisma.actorType.findFirst({
    where: { code: "MOA" },
  });
  const actorTypeMoe = await prisma.actorType.findFirst({
    where: { code: "MOE" },
  });

  if (!actorTypeMoa || !actorTypeMoe) {
    throw new Error(
      "Expected actor types with codes 'MOA' and 'MOE' to be present. Did you run migrations?",
    );
  }

  // Create tags
  console.log("🏷️  Creating tags...");
  for (let i = 0; i < 50; i++) {
    await TagFaker.create();
  }

  // Create hosting options
  console.log("🖥️  Creating hosting options...");
  const hostingOptions = [
    await HostingOptionFaker.create(),
    await HostingOptionFaker.create(),
  ];

  // Create applications
  console.log("📱 Creating applications...");
  const applications = [];
  for (let i = 0; i < 100; i++) {
    const user = i % 2 === 0 ? adminUser : regularUser;
    const app = await ApplicationFaker.create(user);
    applications.push(app);
  }
  const app1 = applications[0];
  const app2 = applications[1];

  // Link hostings to applications
  console.log("🏗️  Linking hostings to applications...");
  let hostingsCount = 0;
  for (const [index, app] of applications.entries()) {
    const hostingOption = hostingOptions[index % hostingOptions.length];
    await HostingFaker.create({
      hostingOption,
      application: app,
      user: adminUser,
    });
    hostingsCount += 1;
  }

  // Add technical debt info
  console.log("💸 Adding technical debt info...");
  let technicalDebtCount = 0;
  for (const app of applications) {
    await TechnicalDebtInfoFaker.create({
      application: app,
      user: adminUser,
    });
    technicalDebtCount += 1;
  }

  // Create Business Division
  console.log("🏬  Creating Business Division...");
  for (let i = 0; i < 50; i++) {
    await BusinessDivisionFaker.create();
  }

  // Add compliance data to existing applications (several apps per category)
  console.log("✅ Adding compliance data to existing applications...");
  for (const app of applications) {
    await ComplianceFaker.create({
      application: app,
    });
  }

  // Create actors (requires applications)
  console.log("🎪 Creating actors...");
  await ActorFaker.link({
    userEmail: adminUser.email,
    actorTypeId: actorTypeMoa.id,
    applicationId: app1.id,
  });
  await ActorFaker.link({
    userEmail: adminUser.email,
    actorTypeId: actorTypeMoe.id,
    applicationId: app2.id,
  });

  console.log("✅ Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
