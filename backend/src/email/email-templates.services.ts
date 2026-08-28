import * as fs from "node:fs";
import * as path from "node:path";
import { Injectable } from "@nestjs/common";
import { convert } from "html-to-text";
import { LoggerService } from "src/logger/logger.service";

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
<html>
<head><meta charset="UTF-8"><title>{{title}}</title></head>
<body>
  <div>{{content}}</div>
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

    content = this.replaceVariables(content, variables);

    const html = this.replaceVariables(this.baseTemplate, {
      title:
        variables.title || "Notification from Référentiel des Applications",
      headerTitle: variables.headerTitle || "Notification",
      content,
    });

    return html;
  }

  private replaceVariables(
    template: string,
    variables: Record<string, string>,
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      // Fonction de remplacement (et non chaîne) : neutralise les motifs spéciaux de String.replace
      // ($&, $', $`, $1…) qu'une valeur utilisateur pouvait sinon exploiter pour dupliquer ou
      // décaler le contenu du template (#2380).
      const replacement = value ?? "";
      result = result.replace(regex, () => replacement);
    }

    const unreplacedVariables = result.match(/\{\{[^}]+\}\}/g);
    if (unreplacedVariables && unreplacedVariables.length > 0) {
      this.logger.warn(
        `Found unreplaced variables in template: ${unreplacedVariables.join(", ")}`,
      );
    }

    result = result.replace(/\{\{[^}]+\}\}/g, "");

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
        { selector: "a", options: { ignoreHref: true } },
      ],
    });
  }
}
