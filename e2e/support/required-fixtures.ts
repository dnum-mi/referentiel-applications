import type { ApiClient } from "../fixtures/api-client";

export const QA_APPLICATION_LABELS = [
  "QA-SCOPE-TOTO",
  "QA-SCOPE-ABCD",
  "QA-GROUP-PARENT",
  "QA-GROUP-CHILD",
  "QA-EOL",
] as const;

const QA_ORGANIZATIONS = ["TOTO", "TOTO/TUTU", "ABCD"] as const;
const QA_USERS = [
  "scope-admin@example.com",
  "member-toto-tutu@example.com",
  "member-toto@example.com",
  "qa-target@example.com",
  "qa-outside@example.com",
] as const;

type FixtureApi = Pick<
  ApiClient,
  "applications" | "organizations" | "userByEmail"
>;

/** Vérifie les fixtures via les mêmes recherches authentifiées que les specs (index compris). */
export async function verifyRequiredFixtures(api: FixtureApi): Promise<void> {
  const checks = await Promise.all([
    ...QA_APPLICATION_LABELS.map(async (label) => {
      const response = await api.applications(
        `search=${encodeURIComponent(label)}&pageSize=20&page=0`,
      );
      return response?.results.some((app) => app.label === label)
        ? null
        : `application ${label}`;
    }),
    ...QA_ORGANIZATIONS.map(async (path) => {
      const response = await api.organizations(path);
      return response?.results.some((org) => org.path === path)
        ? null
        : `organisation ${path}`;
    }),
    ...QA_USERS.map(async (email) =>
      (await api.userByEmail(email)) ? null : `utilisateur ${email}`,
    ),
  ]);
  const missing = checks.filter((entry) => entry !== null);
  if (missing.length) {
    throw new Error(
      `Fixtures QA obligatoires introuvables :\n- ${missing.join("\n- ")}\n` +
        "Appliquer le seed principal puis `pnpm db:seed:qa` dans le backend. " +
        "Si les données existent déjà, vérifier l'accès API et rafraîchir " +
        "la vue matérialisée application_search_index avant de relancer la campagne.",
    );
  }
}
