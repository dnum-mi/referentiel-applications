import { PrismaClient, Roles, priorityRestart } from "@prisma/client";

/**
 * Seed QA — fixtures déterministes et idempotentes pour la non-régression e2e (#1825, Lot 2 :
 * scope admin par périmètre & groupes d'acteurs). À lancer APRÈS le seed principal :
 *   pnpm db:seed && pnpm db:seed:qa
 *
 * Les utilisateurs sont mappés par email aux comptes Keycloak de test (scope-admin, member-toto-tutu,
 * member-toto) : à la première connexion, `findOrCreateByEmail` retrouve l'utilisateur seedé et
 * conserve son organisation / périmètre / rôle.
 */
const prisma = new PrismaClient();

// Organisations hiérarchiques (ids fixes pour des upserts stables).
const ORG = {
  toto: {
    id: "a0000000-0000-4000-8000-000000000001",
    path: "TOTO",
    parentId: null as string | null,
  },
  totoTutu: {
    id: "a0000000-0000-4000-8000-000000000002",
    path: "TOTO/TUTU",
    parentId: "a0000000-0000-4000-8000-000000000001",
  },
  abcd: {
    id: "a0000000-0000-4000-8000-000000000003",
    path: "ABCD",
    parentId: null as string | null,
  },
};

// Type d'acteur dédié aux tests, isolé de MOA/MOE (matrice : lecture + écriture appli).
const QA_ACTOR_TYPE_ID = "a0000000-0000-4000-8000-0000000000a1";

// Applications fixtures (labels uniques et recherchables, ids fixes).
const APP = {
  scopeToto: {
    id: "a0000000-0000-4000-8000-0000000000b1",
    label: "QA-SCOPE-TOTO",
  },
  scopeAbcd: {
    id: "a0000000-0000-4000-8000-0000000000b2",
    label: "QA-SCOPE-ABCD",
  },
  groupParent: {
    id: "a0000000-0000-4000-8000-0000000000b3",
    label: "QA-GROUP-PARENT",
  },
  groupChild: {
    id: "a0000000-0000-4000-8000-0000000000b4",
    label: "QA-GROUP-CHILD",
  },
};

async function ensureOrganization(org: {
  id: string;
  path: string;
  parentId: string | null;
}) {
  return prisma.organization.upsert({
    where: { id: org.id },
    create: {
      id: org.id,
      path: org.path,
      parentId: org.parentId,
      sigle: org.path.slice(0, 4).toUpperCase(),
    },
    update: { path: org.path, parentId: org.parentId },
  });
}

async function ensureUser(
  email: string,
  role: Roles,
  organizationId: string | null,
  scopeOrganizationId: string | null,
) {
  return prisma.user.upsert({
    where: { email },
    create: { email, role, organizationId, scopeOrganizationId },
    update: { role, organizationId, scopeOrganizationId },
  });
}

async function ensureApplication(
  app: { id: string; label: string },
  createdById: string,
) {
  const existing = await prisma.application.findUnique({
    where: { id: app.id },
  });
  if (existing) return existing;
  const created = await prisma.application.create({
    data: {
      id: app.id,
      label: app.label,
      shortName: app.label,
      description: `Fixture QA ${app.label}`,
      priorityRestart: Object.values(priorityRestart)[0],
      quality: 50,
      metadatas: { create: [{ createdById }] },
    },
  });
  const status = await prisma.applicationStatus.create({
    data: { applicationId: created.id, status: "under_construction" },
  });
  return prisma.application.update({
    where: { id: created.id },
    data: { currentStatusId: status.id },
  });
}

async function ensureActor(
  id: string,
  applicationId: string,
  organizationId: string,
  isGroup: boolean,
  email: string | null,
) {
  return prisma.actor.upsert({
    where: { id },
    create: {
      id,
      applicationId,
      organizationId,
      isGroup,
      email,
      actorTypeId: QA_ACTOR_TYPE_ID,
      firstname: "QA",
      lastname: "Actor",
    },
    update: {
      applicationId,
      organizationId,
      isGroup,
      email,
      actorTypeId: QA_ACTOR_TYPE_ID,
    },
  });
}

async function seedQa() {
  console.log("🏢 QA — organisations hiérarchiques (TOTO, TOTO/TUTU, ABCD)…");
  await ensureOrganization(ORG.toto);
  await ensureOrganization(ORG.totoTutu);
  await ensureOrganization(ORG.abcd);

  console.log("👤 QA — utilisateurs scopés (mappés aux comptes Keycloak)…");
  const scopeAdmin = await ensureUser(
    "scope-admin@example.com",
    Roles.ADMIN,
    ORG.toto.id,
    ORG.toto.id,
  );
  await ensureUser(
    "member-toto-tutu@example.com",
    Roles.VISITOR,
    ORG.totoTutu.id,
    null,
  );
  await ensureUser("member-toto@example.com", Roles.VISITOR, ORG.toto.id, null);
  // Cible d'édition (jamais connectée → pas de compte Keycloak) : org TOTO/TUTU, dans le périmètre TOTO.
  await ensureUser(
    "qa-target@example.com",
    Roles.READER,
    ORG.totoTutu.id,
    null,
  );
  // Cible HORS périmètre (organisation ABCD) : un admin scopé TOTO/ ne doit pas pouvoir l'éditer.
  await ensureUser("qa-outside@example.com", Roles.READER, ORG.abcd.id, null);

  console.log("🎭 QA — type d'acteur dédié + matrice (AppRead/AppWrite)…");
  await prisma.actorType.upsert({
    where: { id: QA_ACTOR_TYPE_ID },
    create: {
      id: QA_ACTOR_TYPE_ID,
      code: "QA_GROUP",
      label: "QA Groupe (test)",
      description: "Type d'acteur dédié aux tests de non-régression",
    },
    update: { label: "QA Groupe (test)" },
  });
  await prisma.appPermissions.upsert({
    where: { actorTypeId: QA_ACTOR_TYPE_ID },
    create: {
      actorTypeId: QA_ACTOR_TYPE_ID,
      AppRead: true,
      AppWrite: true,
      ActorRead: true,
      ActorWrite: false,
      ComplianceRead: true,
      ComplianceWrite: false,
      HostingRead: true,
      HostingWrite: false,
      MetadataRead: true,
      RelationRead: true,
      RelationWrite: false,
      LinkRead: true,
      LinkWrite: false,
    },
    update: { AppRead: true, AppWrite: true },
  });

  console.log("📱 QA — applications fixtures + acteurs…");
  // #12 : app avec un acteur d'organisation TOTO/* → un admin scopé TOTO/ y est admin.
  // Acteur SANS email : le scope ne dépend que de l'organisation, et le batch MAIA (MAI-04) ne
  // synchronise que les acteurs avec email → la fixture n'est pas écrasée par les tests MAIA.
  const appScopeToto = await ensureApplication(APP.scopeToto, scopeAdmin.id);
  await ensureActor(
    "a0000000-0000-4000-8000-0000000000c1",
    appScopeToto.id,
    ORG.totoTutu.id,
    false,
    null,
  );

  // #13 : app avec un acteur d'organisation ABCD/* uniquement → l'admin scopé TOTO/ n'y est pas admin.
  const appScopeAbcd = await ensureApplication(APP.scopeAbcd, scopeAdmin.id);
  await ensureActor(
    "a0000000-0000-4000-8000-0000000000c2",
    appScopeAbcd.id,
    ORG.abcd.id,
    false,
    null,
  );

  // #16 : groupe d'acteur TOTO/ → un membre de TOTO/TUTU est acteur.
  const appGroupParent = await ensureApplication(
    APP.groupParent,
    scopeAdmin.id,
  );
  await ensureActor(
    "a0000000-0000-4000-8000-0000000000c3",
    appGroupParent.id,
    ORG.toto.id,
    true,
    null,
  );

  // #17 : groupe d'acteur TOTO/TUTU → un membre de TOTO (parent) n'est PAS acteur.
  const appGroupChild = await ensureApplication(APP.groupChild, scopeAdmin.id);
  await ensureActor(
    "a0000000-0000-4000-8000-0000000000c4",
    appGroupChild.id,
    ORG.totoTutu.id,
    true,
    null,
  );

  console.log("✅ Seed QA terminé.");
}

seedQa()
  .then(async () => {
    // Les applications sont insérées directement via Prisma (sans passer par le
    // hook applicatif), donc on rafraîchit explicitement l'index full-text pour
    // que la recherche reflète les données seedées.
    try {
      await prisma.$executeRawUnsafe(
        "REFRESH MATERIALIZED VIEW application_search_index",
      );
    } catch (error) {
      console.warn(
        "Impossible de rafraîchir application_search_index (migration non appliquée ?)",
        error,
      );
    }
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
