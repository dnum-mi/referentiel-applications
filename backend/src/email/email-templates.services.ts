import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { convert } from "html-to-text";
import { LoggerService } from "src/logger/logger.service";
import { escapeHtml } from "src/utils/escape-html.util";
import { safeExportLink } from "src/utils/export.util";

@Injectable()
export class EmailTemplateService {
  private readonly templatesPath: string;
  private baseTemplate: string;

  constructor(private readonly logger: LoggerService) {
    this.templatesPath = path.join(__dirname, "templates");
    this.loadBaseTemplate();
  }

  private loadBaseTemplate(): void {
    const baseTemplatePath = path.join(
      this.templatesPath,
      "base.template.html",
    );
    this.logger.log(`Loading base template from: ${baseTemplatePath}`);
    try {
      this.baseTemplate = fs.readFileSync(baseTemplatePath, "utf-8");
      this.logger.log("Base email template loaded successfully");
    } catch (error) {
      this.logger.error(
        `Failed to load base email template from ${baseTemplatePath}:`,
        error,
      );
      this.logger.warn("Using fallback base template");
      this.baseTemplate = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{{title}}</title></head>
<body>
  <main><h1>{{title}}</h1>{{content}}</main>
  <footer><p>L'équipe Référentiel des Applications</p></footer>
</body>
</html>`;
    }
  }

  public render(
    templateName: string,
    variables: Record<string, string>,
  ): string {
    const contentTemplatePath = path.join(
      this.templatesPath,
      `${templateName}.template.html`,
    );

    this.logger.log(
      `Loading template ${templateName} from: ${contentTemplatePath}`,
    );
    let content: string;
    try {
      content = fs.readFileSync(contentTemplatePath, "utf-8");
      this.logger.log(`Template ${templateName} loaded successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to load template ${templateName} from ${contentTemplatePath}:`,
        error,
      );
      this.logger.warn(`Using fallback content for template ${templateName}`);
      content =
        "<p>Message automatique du système référentiel des applications</p>";
    }

    // Seuls ces fragments sont construits en HTML par EmailService ; les
    // autres valeurs restent du texte et ne peuvent altérer le document.
    const htmlFragments = new Set([
      "messageBlock",
      "applicationsSummary",
      "targetsRows",
      "changedFields",
    ]);
    const safeVariables = Object.fromEntries(
      Object.entries(variables).map(([key, value]) => [
        key,
        htmlFragments.has(key)
          ? value
          : escapeHtml(
              key === "applicationUrl" ? (safeExportLink(value) ?? "") : value,
            ),
      ]),
    );
    content = this.replaceVariables(content, safeVariables);

    const html = this.replaceVariables(this.baseTemplate, {
      title: escapeHtml(
        variables.title || "Notification du Référentiel des applications",
      ),
      headerTitle: escapeHtml(variables.headerTitle || "Notification"),
      content,
    });

    return html;
  }

  private replaceVariables(
    template: string,
    variables: Record<string, string>,
  ): string {
    const missing = new Set<string>();
    // Un seul passage sur le modèle : les motifs $ et {{...}} provenant d'une
    // valeur restent littéraux et ne sont jamais réinterprétés comme du HTML.
    const result = template.replace(
      /\{\{([^{}]+)\}\}/g,
      (placeholder: string, key: string) => {
        if (Object.hasOwn(variables, key)) return variables[key] ?? "";
        missing.add(placeholder);
        return "";
      },
    );

    if (missing.size > 0) {
      this.logger.warn(
        `Found unreplaced variables in template: ${[...missing].join(", ")}`,
      );
    }
    return result;
  }

  public htmlToText(html: string): string {
    // Use a real HTML parser instead of hand-rolled regexes: regex-based tag
    // stripping and entity decoding are inherently incomplete (CodeQL
    // js/bad-tag-filter, js/incomplete-multi-character-sanitization,
    // js/double-escaping) and easy to bypass.
    return convert(html, {
      wordwrap: false,
      selectors: [
        { selector: "img", format: "skip" },
        { selector: "h1", options: { uppercase: false } },
        { selector: "h2", options: { uppercase: false } },
        { selector: "a", options: { ignoreHref: false } },
      ],
    });
  }
}
