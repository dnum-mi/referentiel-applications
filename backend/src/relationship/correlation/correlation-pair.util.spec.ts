import { BadRequestException } from "@nestjs/common";
import { normalizeCorrelationPair } from "./correlation-pair.util";

describe("normalizeCorrelationPair (#2283)", () => {
  it("renvoie la paire inchangée quand elle est déjà en ordre canonique", () => {
    expect(normalizeCorrelationPair("aaa", "bbb")).toEqual({
      applicationSourceId: "aaa",
      applicationTargetId: "bbb",
    });
  });

  it("réordonne la paire inversée : A→B et B→A donnent la même paire", () => {
    const direct = normalizeCorrelationPair("aaa", "bbb");
    const reversed = normalizeCorrelationPair("bbb", "aaa");
    expect(reversed).toEqual(direct);
  });

  it("rejette la corrélation d'une application avec elle-même", () => {
    expect(() => normalizeCorrelationPair("aaa", "aaa")).toThrow(
      BadRequestException,
    );
  });
});
