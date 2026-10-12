import * as fs from "node:fs";
import * as path from "node:path";
import type { ConfigService } from "@nestjs/config";
import type { LoggerService } from "src/logger/logger.service";
import type { EmailLogService } from "./email-log.service";
import { EmailTemplateService } from "./email-templates.services";
import { EmailService } from "./email.service";

const logger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as LoggerService;
const templates = fs
  .readdirSync(path.join(__dirname, "templates"))
  .filter(
    (name) => name.endsWith(".template.html") && name !== "base.template.html",
  )
  .map((name) => name.replace(".template.html", ""));

describe("Structure des e-mails réellement rendus", () => {
  const templateService = new EmailTemplateService(logger);

  it.each(templates)(
    "donne au modèle %s langue, titre et contenu principal sans attributs de présentation",
    (name) => {
      const applicationUrl = "https://example.test/application?a=1&b=2";
      const html = templateService.render(name, {
        title: "Notification « test & <script> »",
        actorName: "Nom <img src=x>",
        campaignName: "Campagne",
        applicationName: "Application",
        applicationLabel: "Application",
        applicationUrl,
        description: "Un signalement",
        notes: "Note lisible",
        status: "En cours",
      });
      expect(html).toContain('<html lang="fr">');
      expect(html).toMatch(
        /<title>Notification « test &amp; &lt;script&gt; »<\/title>/,
      );
      expect(html).toContain("<main");
      expect(html).toContain("<h1");
      const tableTags = html.match(/<(?:table|td|th)\b[^>]*>/g) ?? [];
      expect(tableTags.length).toBeGreaterThan(0);
      for (const tag of tableTags) {
        expect(tag).not.toMatch(
          /\s(?:width|height|align|cellpadding|cellspacing|border|bgcolor|valign)\s*=/i,
        );
      }
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("<img src=x>");
      const text = templateService.htmlToText(html);
      expect(text).toContain("Notification « test & <script> »");
      expect(text).toContain("Référentiel des Applications");
      const links = Array.from(
        html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g),
        ([, href]) => templateService.htmlToText(href),
      );
      const textTokens = text
        .split(/\s+/)
        .map((token) => token.replace(/^\[/, "").replace(/\]$/, ""));
      for (const link of links) expect(textTokens).toContain(link);
      const template = fs.readFileSync(
        path.join(__dirname, "templates", `${name}.template.html`),
        "utf8",
      );
      if (template.includes("{{applicationUrl}}"))
        expect(links).toContain(applicationUrl);
    },
  );

  it("préserve la structure et les noms de colonnes du tableau de résultats", () => {
    const html = templateService.render("quality-campaign-sponsor-report", {
      campaignName: "Campagne & données",
      targetsRows:
        '<tr><th scope="row">Application test</th><td>50</td><td>60</td><td>+10 pts</td><td>Action</td></tr>',
    });
    const table = html.match(/<table\b[^>]*>\s*<caption[\s\S]*?<\/table>/)?.[0];
    expect(table).toBeDefined();
    expect(table).not.toContain('role="presentation"');
    expect(table).toContain("Campagne &amp; données");
    expect(table!.match(/scope="col"/g)).toHaveLength(5);
    expect(table).toContain('scope="row"');
    expect(table).toContain("<thead>");
    expect(table).toContain("<tbody>");
  });

  it("échappe les valeurs utilisateur des fragments de digest et de résultats, sans envoyer d'e-mail", async () => {
    const configValues: Record<string, unknown> = {
      "email.enabled": false,
      "email.port": 587,
      "email.secure": false,
      BASE_URL: "https://example.test",
      "email.from": "no-reply@example.test",
    };
    const config = {
      get: (key: string, fallback?: unknown) => configValues[key] ?? fallback,
    } as unknown as ConfigService;
    const log = jest.fn(
      async (email: { html: string; text: string; subject: string }) => {
        void email;
        return null;
      },
    );
    const service = new EmailService(
      config,
      templateService,
      { log } as unknown as EmailLogService,
      logger,
    );
    await service.sendQualityCampaignSponsorReportEmail({
      recipientEmails: ["nobody@example.test"],
      campaignName: "Campagne <test>",
      targets: [
        {
          applicationId: "app-1",
          applicationLabel: "Application <script>alert(1)</script>",
          iqAtStart: 0,
          iqCurrent: 20,
          completedActions: ["Action <img src=x>"],
        },
      ],
      averageIqAtStart: 0,
      averageIqCurrent: 20,
      averageDelta: 20,
    });
    const html = log.mock.calls[0][0].html;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("Application &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain('scope="row"');
    expect(html).toContain("+20 pts");
    await service.sendDailyDigestNotification("nobody@example.test", [
      {
        applicationId: "app-1",
        applicationLabel: 'Application <img src=x> & "test"',
        changes: [
          {
            action: "update",
            description: "Texte <script>alert(1)</script>",
            createdAt: new Date("2026-10-08T10:00:00Z"),
          },
        ],
      },
    ]);
    const digest = log.mock.calls[1][0].html;
    expect(digest).not.toContain("<script>");
    expect(digest).not.toContain("<img src=x>");
    expect(digest).toContain("<h2");
    expect(digest).toContain("Texte &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(log.mock.calls[1][0].text).toContain(
      "https://example.test/applications/app-1",
    );
  });
});
