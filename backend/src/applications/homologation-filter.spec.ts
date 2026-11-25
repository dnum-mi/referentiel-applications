import { validate } from "class-validator";
import { ApplicationSearchDto } from "./dto/search-application.dto";
import { homologationWhere } from "./homologation-filter";

describe("Homologation deadlines", () => {
  it("expires only completed approvals before the Paris day", () => {
    const where = homologationWhere(
      { homologationDateMode: "expired", homologationStatus: "dispensee" },
      new Date("2026-11-09T23:30:00Z"),
    );
    expect(where).toEqual({
      compliance: {
        homologation_status: "homologuee",
        homologation_date_end: { lt: new Date("2026-11-09T23:00:00Z") },
      },
    });
  });
  it.each([
    ["2026-03-29", "2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z"],
    ["2026-10-25", "2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z"],
  ])("includes the entire day %s across DST", (day, start, end) => {
    expect(
      homologationWhere({
        homologationDateMode: "range",
        homologationDateFrom: day,
        homologationDateTo: day,
      }),
    ).toEqual({
      AND: [
        {
          compliance: {
            homologation_date_end: { gte: new Date(start), lt: new Date(end) },
          },
        },
      ],
    });
  });
  it.each(["homologuee", "dispensee", "en_cours", "non_realisee"] as const)(
    "keeps the declared status %s with missing dates",
    (homologationStatus) => {
      expect(
        homologationWhere({
          homologationStatus,
          homologationDateMode: "missing",
        }),
      ).toEqual({
        AND: [
          { compliance: { homologation_status: homologationStatus } },
          { NOT: { compliance: { homologation_date_end: { not: null } } } },
        ],
      });
    },
  );
  it("rejects reversed and empty ranges", () => {
    expect(() =>
      homologationWhere({ homologationDateMode: "range" }),
    ).toThrow();
    expect(() =>
      homologationWhere({
        homologationDateFrom: "2026-11-10",
        homologationDateTo: "2026-11-09",
      }),
    ).toThrow();
  });
  it.each(["2026-02-30", "2026-13-01", "bad", "2026-11-09T00:00:00Z"])(
    "rejects invalid calendar date %s",
    async (homologationDateFrom) => {
      expect(
        await validate(
          Object.assign(new ApplicationSearchDto(), { homologationDateFrom }),
        ),
      ).not.toHaveLength(0);
    },
  );
});
