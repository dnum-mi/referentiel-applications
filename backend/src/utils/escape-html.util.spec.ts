import { escapeHtml } from "./escape-html.util";

describe("escapeHtml (#2380)", () => {
  it("neutralise les balises HTML", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("échappe les guillemets et l'esperluette", () => {
    expect(escapeHtml(`a & "b" 'c'`)).toBe("a &amp; &quot;b&quot; &#39;c&#39;");
  });

  it("laisse un texte simple inchangé", () => {
    expect(escapeHtml("Merci d'améliorer votre IQ")).toBe(
      "Merci d&#39;améliorer votre IQ",
    );
  });
});
