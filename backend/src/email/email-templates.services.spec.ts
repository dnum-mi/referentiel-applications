import * as fs from "node:fs";
import type { LoggerService } from "src/logger/logger.service";
import { EmailTemplateService } from "./email-templates.services";

jest.mock("node:fs");

const readFileSync = fs.readFileSync as jest.Mock;

const logger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as LoggerService;

describe("EmailTemplateService.render (#2380)", () => {
  afterEach(() => jest.clearAllMocks());

  it("insère les valeurs littéralement, sans réinterpréter les motifs $ de String.replace", () => {
    readFileSync
      .mockReturnValueOnce("{{content}}") // base template (constructeur)
      .mockReturnValueOnce("<div>{{messageBlock}}</div>"); // template de contenu

    const service = new EmailTemplateService(logger);
    const html = service.render("whatever", {
      messageBlock: "AVANT $' $` $& APRES",
    });

    // $' (reste), $` (avant), $& (match) doivent rester littéraux
    expect(html).toContain("AVANT $' $` $& APRES");
    // aucune duplication du contenu autour du placeholder
    expect(html.match(/APRES/g)?.length).toBe(1);
  });
});
