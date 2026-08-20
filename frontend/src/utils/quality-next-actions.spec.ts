import type { QualitySummaryDto } from "@/client/types.gen";
import { describe, expect, it } from "vitest";
import { getQualityNextActions } from "./quality-next-actions";

function buildSummary(overrides: Partial<QualitySummaryDto> = {}): QualitySummaryDto {
  return {
    hasDescription: true,
    hasHosting: true,
    hasSnapvisu: true,
    actors: { MOA: true, MOE: true, TMA: true, HEB: true, REP: true },
    compliances: { DIMA: true, PDMA: true, HOMOLOGATION: true, RGAA: true, DSFR: true, RGPD: true },
    ...overrides,
  };
}

describe("getQualityNextActions", () => {
  it("returns no action when every IQ criterion is satisfied", () => {
    expect(getQualityNextActions(buildSummary())).toEqual([]);
  });

  it("lists an action for each unsatisfied criterion, ignoring RGAA/DSFR/RGPD (not part of the IQ)", () => {
    const summary = buildSummary({
      hasDescription: false,
      compliances: { DIMA: true, PDMA: true, HOMOLOGATION: true, RGAA: false, DSFR: false, RGPD: false },
    });

    const actions = getQualityNextActions(summary);

    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ key: "description", tabId: "tab-infos", impact: "high" });
  });

  it("sorts actions by decreasing impact (high, then medium, then low)", () => {
    const summary = buildSummary({
      hasSnapvisu: false, // low
      actors: { MOA: true, MOE: false, TMA: true, HEB: true, REP: true }, // medium
      hasDescription: false, // high
    });

    const actions = getQualityNextActions(summary);

    expect(actions.map((a) => a.key)).toEqual(["description", "moe", "snapvisu"]);
    expect(actions.map((a) => a.impact)).toEqual(["high", "medium", "low"]);
  });

  it("never exposes a numeric point value — only a qualitative impact tier", () => {
    const actions = getQualityNextActions(buildSummary({ hasDescription: false }));

    for (const action of actions) {
      expect(action).not.toHaveProperty("points");
      expect(action).not.toHaveProperty("score");
      expect(["high", "medium", "low"]).toContain(action.impact);
    }
  });
});
