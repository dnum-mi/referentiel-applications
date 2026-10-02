import { expect, test } from "../fixtures/test";
import type { DataFeature } from "../fixtures/datafeature";
import { AdminPage, ApplicationPage } from "../pom";
import {
  correlationQaFixture,
  removePendingCorrelation,
  requireCorrelationSeed,
  restorePendingCorrelation,
} from "../support/correlation-fixtures";

async function uniqueSuggestion(
  data: DataFeature,
  sourceId: string,
  targetId: string,
) {
  const suggestions = await data.correlationSuggestions(sourceId, targetId);
  expect(
    suggestions,
    "La paire QA doit avoir exactement une suggestion",
  ).toHaveLength(1);
  return suggestions[0];
}

test.describe("Revue des corrélations", () => {
  test("ADM-24 - accepter une corrélation et la retrouver sur les deux fiches et le graphe", async ({
    page,
    data,
  }, testInfo) => {
    const fixture = correlationQaFixture(testInfo.project.name, "accept");
    await restorePendingCorrelation(fixture);
    try {
      const suggestion = await uniqueSuggestion(
        data,
        fixture.source.id,
        fixture.target.id,
      );
      expect(suggestion.status).toBe("PENDING");
      expect(suggestion.score).toBeGreaterThanOrEqual(0.6);
      expect(suggestion.signals.sharedDataCount).toBe(1);

      const admin = new AdminPage(page);
      await admin.open();
      await admin.openCorrelationsTab();
      await admin.expectCorrelationSuggestion(
        suggestion.id,
        fixture.source.label,
        fixture.target.label,
        "En attente",
      );
      await admin.reviewCorrelation(suggestion.id, "accept");

      const accepted = await uniqueSuggestion(
        data,
        fixture.source.id,
        fixture.target.id,
      );
      expect(accepted.status).toBe("ACCEPTED");
      expect(accepted.reviewedById).not.toBeNull();
      expect(accepted.reviewedAt).not.toBeNull();
      await admin.filterCorrelations("ACCEPTED");
      await admin.expectCorrelationSuggestion(
        suggestion.id,
        fixture.source.label,
        fixture.target.label,
        "Acceptée",
      );

      const fiche = new ApplicationPage(page);
      for (const [source, target] of [
        [fixture.source, fixture.target],
        [fixture.target, fixture.source],
      ]) {
        await fiche.open(source.id, "tab-relations");
        await fiche.expectCorrelationWith(target.id, target.label);
        const graph = await data.relationGraph(source.id);
        expect(graph?.edges).toHaveLength(1);
        expect(graph?.edges[0]).toMatchObject({
          sourceId: fixture.source.id,
          targetId: fixture.target.id,
          type: "is_correlated_with",
        });
      }
      await fiche.expectCorrelationGraph(
        fixture.source.label,
        fixture.target.label,
      );
    } finally {
      await restorePendingCorrelation(fixture);
    }
  });

  test("ADM-25 - rejeter une suggestion détectée sans relation ni nouvelle proposition", async ({
    page,
    data,
  }, testInfo) => {
    test.setTimeout(120_000);
    const fixture = correlationQaFixture(testInfo.project.name, "reject");
    await restorePendingCorrelation(fixture);
    try {
      // Partir sans suggestion prouve que la vraie détection retrouve la paire,
      // et que le rejet ultérieur l'exclut réellement (aucune API simulée).
      await removePendingCorrelation(fixture);
      expect(
        await data.correlationSuggestions(fixture.source.id, fixture.target.id),
      ).toEqual([]);
      const admin = new AdminPage(page);
      await admin.open();
      await admin.openCorrelationsTab();
      await admin.runCorrelationDetection();
      const suggestion = await uniqueSuggestion(
        data,
        fixture.source.id,
        fixture.target.id,
      );
      expect(suggestion.status).toBe("PENDING");
      expect(suggestion.signals.sharedDataCount).toBe(1);
      await admin.expectCorrelationSuggestion(
        suggestion.id,
        fixture.source.label,
        fixture.target.label,
        "En attente",
      );
      await admin.reviewCorrelation(suggestion.id, "reject");

      const rejected = await uniqueSuggestion(
        data,
        fixture.source.id,
        fixture.target.id,
      );
      expect(rejected.status).toBe("REJECTED");
      expect(rejected.reviewedById).not.toBeNull();
      expect(rejected.reviewedAt).not.toBeNull();
      await admin.runCorrelationDetection();
      const afterDetection = await uniqueSuggestion(
        data,
        fixture.source.id,
        fixture.target.id,
      );
      expect(afterDetection).toMatchObject({
        id: rejected.id,
        status: "REJECTED",
        reviewedById: rejected.reviewedById,
        reviewedAt: rejected.reviewedAt,
      });
      await admin.filterCorrelations("REJECTED");
      await admin.expectCorrelationSuggestion(
        rejected.id,
        fixture.source.label,
        fixture.target.label,
        "Rejetée",
      );

      const fiche = new ApplicationPage(page);
      for (const application of [fixture.source, fixture.target]) {
        expect((await data.relationGraph(application.id))?.edges).toEqual([]);
        await fiche.open(application.id, "tab-relations");
        await fiche.expectRelationsEmpty();
      }
    } finally {
      await restorePendingCorrelation(fixture);
    }
  });

  test("ADM-26 - afficher une corrélation pré-acceptée du seed sans doublon", async ({
    page,
    data,
  }, testInfo) => {
    const fixture = correlationQaFixture(testInfo.project.name, "accepted");
    await requireCorrelationSeed(fixture);
    const suggestion = await uniqueSuggestion(
      data,
      fixture.source.id,
      fixture.target.id,
    );
    expect(suggestion.status).toBe("ACCEPTED");
    expect(suggestion.reviewedById).not.toBeNull();
    expect(suggestion.reviewedAt).not.toBeNull();
    const fiche = new ApplicationPage(page);
    for (const [source, target] of [
      [fixture.source, fixture.target],
      [fixture.target, fixture.source],
    ]) {
      await fiche.open(source.id, "tab-relations");
      await fiche.expectCorrelationWith(target.id, target.label);
      expect((await data.relationGraph(source.id))?.edges).toHaveLength(1);
    }
    await fiche.expectCorrelationGraph(
      fixture.source.label,
      fixture.target.label,
    );
  });
});
