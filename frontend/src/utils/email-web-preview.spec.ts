import { readFileSync, readdirSync } from "node:fs";
import { URL as NodeURL } from "node:url";
import { createEmailWebPreview } from "./email-web-preview";

const moduleUrl = import.meta.url;
const templatesPath = new NodeURL("../../../backend/src/email/templates/", moduleUrl);
const baseTemplate = readFileSync(new NodeURL("base.template.html", templatesPath), "utf8");
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
const bodyText = (html: string) => parse(html).body.textContent?.replace(/\s+/g, " ").trim();
const legacyEmail = `<!doctype html><html lang="fr"><head><title>Droits modifiés</title></head><body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
    <table role="presentation" width="600" style="max-width:600px;width:100%">
      <tr><td bgcolor="#ffffff">Référentiel des Applications — Une application pour les réunir toutes</td></tr>
      <tr><td><table role="presentation" cellpadding="12"><tr><td>Bonjour Agent, vos droits ont changé.</td></tr></table>
        <table><caption>Permissions</caption><tr><th scope="col">Droit</th></tr><tr><td>Lecture</td></tr></table>
        <a href="https://example.fr/profil">Voir les permissions</a></td></tr>
      <tr><td><img src="https://example.fr/logo.png" width="87" height="70" alt="Ministère" />
        Cet email a été envoyé automatiquement, merci de ne pas y répondre.</td></tr>
    </table>
    <table role="presentation"><tr><td>© Référentiel des Applications - Tous droits réservés</td></tr></table>
  </td></tr></table></body></html>`;

describe("createEmailWebPreview", () => {
  it("structure une copie d’un ancien e-mail et conserve son contenu et son tableau de données", () => {
    const original = legacyEmail;
    const preview = createEmailWebPreview(original);
    const document = parse(preview);
    expect(legacyEmail).toBe(original);
    expect(preview.startsWith("<!doctype html>")).toBe(true);
    expect(document.documentElement.lang).toBe("fr");
    expect(document.title).toBe("Droits modifiés");
    expect(document.querySelectorAll("header,main,footer")).toHaveLength(3);
    expect(document.querySelector("header")?.textContent).toContain("Une application pour les réunir toutes");
    expect(document.querySelector("main")?.textContent).toContain("Bonjour Agent, vos droits ont changé.");
    expect(document.querySelector("footer")?.textContent).toContain("Tous droits réservés");
    expect(bodyText(preview)).toBe(bodyText(original));
    expect(document.querySelectorAll("table")).toHaveLength(1);
    expect(document.querySelector("main table caption")?.textContent).toBe("Permissions");
    expect(document.querySelector("main table th")?.getAttribute("scope")).toBe("col");
    expect(document.querySelector("main a")?.getAttribute("href")).toBe("https://example.fr/profil");
    expect(document.querySelector("img")?.getAttribute("width")).toBe("87");
    expect(document.querySelector("img")?.getAttribute("height")).toBe("70");
    expect(document.querySelector("[align],[bgcolor],[border],[cellpadding],[cellspacing],table[width]")).toBeNull();
    expect(Array.from(document.querySelectorAll("div")).some((element) => element.style.backgroundColor === "rgb(255, 255, 255)")).toBe(
      true,
    );
    expect(Array.from(document.querySelectorAll("div")).some((element) => element.style.padding === "12px")).toBe(true);
  });

  it.each(readdirSync(templatesPath).filter((name) => name.endsWith(".html") && name !== "base.template.html"))(
    "préserve le contenu du modèle actuel %s avec trois zones et sans attributs interdits",
    (name) => {
      const html = baseTemplate
        .replaceAll("{{title}}", "Notification RefApp")
        .replace("{{content}}", readFileSync(new NodeURL(name, templatesPath), "utf8"));
      const preview = createEmailWebPreview(html);
      const document = parse(preview);
      expect(document.querySelectorAll("header,main,footer")).toHaveLength(3);
      expect(bodyText(preview)).toBe(bodyText(html));
      expect(
        document.querySelector("[align],[valign],[bgcolor],[border],[cellpadding],[cellspacing],table[width],table[height]"),
      ).toBeNull();
      expect(document.querySelectorAll('table[role="presentation"]')).toHaveLength(0);
    },
  );

  it("retire les contenus actifs avant de produire le document confiné", () => {
    const preview = createEmailWebPreview(
      `<html><body><script>alert(1)</script><iframe src="https://example.fr"></iframe>
      <img src="https://example.fr/image.png" onerror="alert(1)"><a href="javascript:alert(1)">Lien</a>
      <form action="https://example.fr"><input name="secret"></form><p>Message conservé</p></body></html>`,
      "Aperçu sûr",
    );
    const document = parse(preview);
    expect(document.querySelector("script,iframe,form,input,[onerror],[onclick]")).toBeNull();
    expect(document.querySelector("a")?.getAttribute("href")).toBeNull();
    expect(document.querySelector("main")?.textContent).toContain("Message conservé");
    expect(document.title).toBe("Aperçu sûr");
    expect(document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute("content")).toContain("default-src 'none'");
  });
});
