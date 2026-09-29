/**
 * Contrat partagé du seed et du parcours QA #2288. Chaque navigateur possède
 * ses paires pour que les revues concurrentes ne consomment pas la même suggestion.
 * Aucun import Prisma : le package e2e peut lire ce contrat indépendamment du backend.
 */
const projects = ["chromium", "firefox", "webkit"] as const;
const scenarios = ["accept", "reject", "accepted"] as const;

export type CorrelationQaScenario = (typeof scenarios)[number];

const fixtureId = (value: number) =>
  `c2288000-0000-4000-8000-${String(value).padStart(12, "0")}`;

export const CORRELATION_QA_FIXTURES = projects.flatMap(
  (project, projectIndex) =>
    scenarios.map((scenario, scenarioIndex) => {
      const offset = (projectIndex * scenarios.length + scenarioIndex + 1) * 10;
      const label = `QA-CORRELATION-${project.toUpperCase()}-${scenario.toUpperCase()}`;
      return {
        project,
        scenario,
        source: { id: fixtureId(offset + 1), label: `${label}-PORTAIL` },
        target: { id: fixtureId(offset + 2), label: `${label}-PORTAILS` },
        data: { id: fixtureId(offset + 3), name: `${label}-DONNEE` },
        suggestionId: fixtureId(offset + 4),
        relationId: fixtureId(offset + 5),
      };
    }),
);

export type CorrelationQaFixture = (typeof CORRELATION_QA_FIXTURES)[number];

export function correlationQaFixture(
  project: string,
  scenario: CorrelationQaScenario,
) {
  const fixture = CORRELATION_QA_FIXTURES.find(
    (candidate) =>
      candidate.project === project && candidate.scenario === scenario,
  );
  if (!fixture)
    throw new Error(
      `Aucune fixture de corrélation QA pour ${project}/${scenario}`,
    );
  return fixture;
}
