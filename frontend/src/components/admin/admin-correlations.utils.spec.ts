import type { CorrelationSuggestionDto } from "@/client/types.gen";
import { correlationSignalBadges, formatCorrelationScore } from "./admin-correlations.utils";

const suggestion = (signals: CorrelationSuggestionDto["signals"]) => ({ signals }) as CorrelationSuggestionDto;

describe("admin-correlations.utils (#2286)", () => {
  it("formate le score en pourcentage arrondi", () => {
    expect(formatCorrelationScore(0.756)).toBe("76 %");
    expect(formatCorrelationScore(1)).toBe("100 %");
  });

  it("produit un badge par signal non nul, avec pluriel correct", () => {
    const badges = correlationSignalBadges(suggestion({ nameSimilarity: 0.82, sharedDataCount: 1, sharedActorCount: 3 }));
    expect(badges.map((badge) => badge.label)).toEqual(["Nom similaire à 82 %", "1 donnée partagée", "3 acteurs communs"]);
  });

  it("n'affiche aucun badge pour un signal nul", () => {
    expect(correlationSignalBadges(suggestion({ nameSimilarity: 0, sharedDataCount: 0, sharedActorCount: 0 }))).toEqual([]);
  });
});
