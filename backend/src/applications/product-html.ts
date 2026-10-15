import { escapeHtml } from "src/utils/escape-html.util";
import { createExportHtmlDocument } from "./export-html";
import type { ProductCard } from "./product-export.service";
import { productExportView } from "./product-export.view";

export function createProductHtml(application: ProductCard): Buffer {
  const view = productExportView(application);
  const section = (title: string, value: string) =>
    `<section><h2>${escapeHtml(title)}</h2><p class="text">${escapeHtml(value)}</p></section>`;
  const facts = view.facts
    .map(
      ({ title, value }) =>
        `<dt>${escapeHtml(title)}</dt><dd>${escapeHtml(value)}</dd>`,
    )
    .join("");
  const content = `<p><strong>Statut :</strong> ${escapeHtml(view.status)}</p>
<section><h2>Description flash</h2><dl>${facts}</dl></section>
${section("Proposition de valeur", view.description)}
${section("Objectifs", view.purposes)}
${section("Cibles & utilisateurs", view.targetPopulations)}
<section><h2>Données flash</h2><dl><dt>Indice de qualité de la fiche</dt><dd>${escapeHtml(view.quality)}</dd><dt>Nombre de clients et d’utilisateurs</dt><dd>${escapeHtml(view.clients)}</dd></dl></section>
${section("Relation client", view.customerRelationship)}
${section("Coûts et revenus", view.costs)}
<p>Source : informations générales de la fiche RefApp ${escapeHtml(application.id)}. Les métriques d’usage, la relation client et les coûts ne sont pas des champs de cette fiche ; aucune valeur n’est déduite.</p>`;
  return createExportHtmlDocument(`Fiche produit : ${view.title}`, content);
}
