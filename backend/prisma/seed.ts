import { PrismaClient, Roles } from "@prisma/client";
import { ApplicationFaker } from "../tests/fakers/application.faker";
import { UserFaker } from "../tests/fakers/user.faker";
import { OrganizationFaker } from "../tests/fakers/organization.faker";
import { ActorFaker } from "../tests/fakers/actor.faker";
import { TagFaker } from "../tests/fakers/tag.faker";
import { HostingOptionFaker } from "../tests/fakers/hosting-option.faker";
import { HostingFaker } from "../tests/fakers/hosting.faker";
import { TechnicalDebtInfoFaker } from "../tests/fakers/technical-debt-info.faker";
import { ComplianceFaker } from "../tests/fakers/compliance.faker";
import { StatsFaker } from "../tests/fakers/stats.faker";
import { BusinessDivisionFaker } from "tests/fakers/business-division.faker";
import { LabelSourceFaker } from "tests/fakers/label-source.faker";
import { parseArgs } from "node:util";

const prisma = new PrismaClient();

const options = {
  environment: { type: "string" as const },
  stress: { type: "string" as const },
};

async function seed({
  extraReadUsersCount = 0,
  organizationsCount = 50,
  tagsCount = 50,
  labelSourcesCount = 15,
  hostingOptionsCount = 2,
  applicationsCount = 100,
  businessDivisionsCount = 50,
} = {}) {
  // Create test users
  console.log("👤 Creating test users...");
  const adminUser = await UserFaker.create({
    email: "admin@example.com",
    role: Roles.ADMIN,
  });
  const regularUser = await UserFaker.create({
    email: "user@example.com",
    role: Roles.READER,
  });

  for (let i = 0; i < extraReadUsersCount; i++) {
    await UserFaker.create({
      role: Roles.READER,
    });
  }

  // Create organizations
  console.log("🏢 Creating test organizations...");
  for (let i = 0; i < organizationsCount; i++) {
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
  for (let i = 0; i < tagsCount; i++) {
    await TagFaker.create();
  }

  // Create label sources
  console.log("🖥️  Creating label sources...");
  for (let i = 0; i < labelSourcesCount; i++) {
    await LabelSourceFaker.create();
  }

  // Create hosting options
  console.log("🖥️  Creating hosting options...");
  const hostingOptions = [];
  for (let i = 0; i < hostingOptionsCount; i++) {
    hostingOptions.push(await HostingOptionFaker.create());
  }

  // Create applications
  console.log("📱 Creating applications...");
  const applications = [];
  for (let i = 0; i < applicationsCount; i++) {
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
  const businessDivisions = [];
  for (let i = 0; i < businessDivisionsCount; i++) {
    businessDivisions.push(await BusinessDivisionFaker.create());
  }

  // Link some organizations to business divisions
  console.log("🔗 Linking organizations to business divisions...");
  const organizations = await prisma.organization.findMany();
  for (const [index, org] of organizations.entries()) {
    if (index % 3 === 0) continue; // ~1/3 des organisations sans business division
    const bd = businessDivisions[index % businessDivisions.length];
    await prisma.organization.update({
      where: { id: org.id },
      data: { businessDivisionId: bd.id },
    });
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

  console.log("� Creating quality stats...");
  const now = new Date();
  const monthsCount = 6;
  for (let i = 0; i < monthsCount; i++) {
    const date = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - (monthsCount - 1 - i),
        1,
        0,
        0,
        0,
        0,
      ),
    );
    await StatsFaker.create({ date });
  }

  console.log("✅ Database seeded successfully!");
}

function main() {
  const {
    values: { environment },
  } = parseArgs({ options });
  console.log(
    `🌱 Starting database seeding... ${environment ?? "development"}`,
  );
  switch (environment) {
    case "development":
    default:
      return seed();
    case "stress":
      return seed({
        extraReadUsersCount: 500,
        organizationsCount: 1000,
        tagsCount: 550,
        labelSourcesCount: 5000,
        hostingOptionsCount: 20,
        applicationsCount: 5000,
        businessDivisionsCount: 450,
      });
  }
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
