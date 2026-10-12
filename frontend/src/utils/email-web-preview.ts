import DOMPurify from "dompurify";

const PRESENTATION_ATTRIBUTES = [
  "align",
  "alink",
  "background",
  "bgcolor",
  "border",
  "cellpadding",
  "cellspacing",
  "char",
  "charoff",
  "clear",
  "color",
  "compact",
  "face",
  "frame",
  "frameborder",
  "hspace",
  "link",
  "marginheight",
  "marginwidth",
  "nowrap",
  "rules",
  "text",
  "valign",
  "vlink",
  "vspace",
  "size",
];
const DIMENSION_ELEMENTS = new Set(["IMG", "OBJECT", "EMBED", "CANVAS", "SVG"]);

function cssLength(value: string | null) {
  if (!value || !/^\d+(?:\.\d+)?%?$/.test(value.trim())) return undefined;
  return value.includes("%") ? value.trim() : `${value.trim()}px`;
}

function setTableCellPadding(table: HTMLTableElement, padding: string) {
  for (const cell of table.querySelectorAll<HTMLElement>("td,th")) {
    if (cell.closest("table") === table && !cell.style.padding) cell.style.padding = padding;
  }
}

function convertPresentationAttributes(element: HTMLElement) {
  const setStyle = (property: string, value: string | undefined | null) => {
    // Un style explicite garde la priorité qu’il avait sur l’attribut HTML historique.
    if (value && !element.style.getPropertyValue(property)) element.style.setProperty(property, value);
  };
  setStyle("text-align", element.getAttribute("align"));
  setStyle("vertical-align", element.getAttribute("valign"));
  setStyle("background-color", element.getAttribute("bgcolor"));
  setStyle("color", element.getAttribute("color") ?? element.getAttribute("text"));
  setStyle("font-family", element.getAttribute("face"));
  setStyle("clear", element.getAttribute("clear"));
  if (element.hasAttribute("nowrap")) setStyle("white-space", "nowrap");

  const border = cssLength(element.getAttribute("border"));
  if (border) setStyle("border", `${border} solid`);
  const spacing = cssLength(element.getAttribute("cellspacing"));
  if (spacing) setStyle("border-spacing", spacing);
  const padding = cssLength(element.getAttribute("cellpadding"));
  if (padding && element instanceof HTMLTableElement) setTableCellPadding(element, padding);
  for (const dimension of ["width", "height"]) {
    if (!DIMENSION_ELEMENTS.has(element.tagName)) {
      setStyle(dimension, cssLength(element.getAttribute(dimension)));
      element.removeAttribute(dimension);
    }
  }
  for (const attribute of PRESENTATION_ATTRIBUTES) {
    if (attribute !== "size" || element.tagName !== "SELECT") element.removeAttribute(attribute);
  }
}

function wrapContents(document: Document, element: Element, tag: "header" | "main" | "footer") {
  const region = document.createElement(tag);
  while (element.firstChild) region.append(element.firstChild);
  element.append(region);
  return region;
}

function structureEmailRegions(document: Document) {
  const body = document.body;
  // Le modèle RefApp historique utilise trois lignes : marque, message, pied de page.
  // On reconnaît ces zones existantes ; un autre HTML reçoit seulement une zone principale.
  const layout = Array.from(body.querySelectorAll<HTMLTableElement>('table[role="presentation"]')).find((table) => {
    const rows = Array.from(table.rows);
    return (
      rows.length === 3 &&
      rows.every((row) => row.cells.length === 1) &&
      rows[0].textContent?.includes("Référentiel des Applications") &&
      /Cet e-?mail a été envoyé automatiquement/i.test(rows[2].textContent ?? "")
    );
  });
  if (layout) {
    const [headerRow, contentRow, footerRow] = Array.from(layout.rows);
    if (!body.querySelector("header")) wrapContents(document, headerRow.cells[0], "header");
    if (!body.querySelector("main")) wrapContents(document, contentRow.cells[0], "main");
    const footer = body.querySelector("footer") ?? wrapContents(document, footerRow.cells[0], "footer");
    const copyright = Array.from(body.querySelectorAll<HTMLTableElement>('table[role="presentation"]')).find((table) =>
      /^©\s*Référentiel des Applications\s*-\s*Tous droits réservés\s*$/.test(table.textContent?.trim() ?? ""),
    );
    if (copyright && !footer.contains(copyright)) footer.append(document.createTextNode("\n"), copyright);
  }
  if (!body.querySelector("main")) {
    const main = document.createElement("main");
    for (const node of Array.from(body.childNodes)) {
      if (!(node instanceof HTMLElement) || !["HEADER", "FOOTER"].includes(node.tagName)) main.append(node);
    }
    body.insertBefore(main, body.querySelector(":scope > footer"));
  }
}

function replaceElement(document: Document, element: Element, tag: string) {
  const replacement = document.createElement(tag);
  for (const attribute of Array.from(element.attributes)) replacement.setAttribute(attribute.name, attribute.value);
  while (element.firstChild) replacement.append(element.firstChild);
  element.replaceWith(replacement);
  return replacement;
}

function flattenLayoutTables(document: Document) {
  const constrainLayoutBox = (element: HTMLElement) => {
    element.style.boxSizing = "border-box";
    const maximumWidth = element.style.maxWidth;
    element.style.maxWidth = maximumWidth && maximumWidth !== "none" ? `min(100%, ${maximumWidth})` : "100%";
  };
  for (const table of Array.from(document.body.querySelectorAll('table[role="presentation"]'))) {
    // Les véritables tableaux de données, éventuellement imbriqués, gardent table/th/scope.
    const structuralElements = Array.from(table.querySelectorAll("caption,thead,tbody,tfoot,tr,td,th")).filter(
      (element) => element.closest("table") === table,
    );
    structuralElements.reverse();
    for (const element of structuralElements) constrainLayoutBox(replaceElement(document, element, "div"));
    const container = replaceElement(document, table, "div");
    constrainLayoutBox(container);
    container.removeAttribute("role");
    container.removeAttribute("summary");
    if (!container.style.margin) container.style.marginInline = "auto";
  }
}

/** Crée une copie web ; ne modifie jamais le HTML archivé ou le document de l’application. */
export function createEmailWebPreview(html: string, fallbackTitle = "Contenu de l’e-mail") {
  const source = new DOMParser().parseFromString(html, "text/html");
  const title = source.title || fallbackTitle;
  const language = source.documentElement.lang || "fr";
  const direction = source.documentElement.dir;
  // Assainir uniquement un fragment. L'enveloppe HTML et ses métadonnées sont reconstruites ici.
  // Le conteneur temporaire conserve aussi les styles et attributs historiques du body.
  const content = source.createElement("div");
  for (const attribute of Array.from(source.body.attributes)) content.setAttribute(attribute.name, attribute.value);
  content.append(...Array.from(source.body.childNodes));
  const sanitized = DOMPurify.sanitize(content.outerHTML, {
    WHOLE_DOCUMENT: false,
    FORBID_TAGS: ["script", "style", "link", "meta", "base", "iframe", "object", "embed", "form", "input", "button", "select", "textarea"],
  });
  const document = new DOMParser().parseFromString(sanitized, "text/html");
  const sanitizedContent = document.body.firstElementChild;
  if (sanitizedContent) {
    for (const attribute of Array.from(sanitizedContent.attributes)) document.body.setAttribute(attribute.name, attribute.value);
    document.body.replaceChildren(...Array.from(sanitizedContent.childNodes));
  }
  document.documentElement.lang = language;
  if (["ltr", "rtl", "auto"].includes(direction)) document.documentElement.dir = direction;
  structureEmailRegions(document);
  for (const element of document.querySelectorAll<HTMLElement>("*")) convertPresentationAttributes(element);
  flattenLayoutTables(document);
  for (const element of Array.from(document.querySelectorAll("font,center,big,strike,tt,blink,marquee"))) {
    const tag = element.tagName;
    const replacement = replaceElement(document, element, ["CENTER", "MARQUEE"].includes(tag) ? "div" : "span");
    if (tag === "CENTER") replacement.style.textAlign = "center";
    if (tag === "BIG") replacement.style.fontSize = "larger";
    if (tag === "STRIKE") replacement.style.textDecoration = "line-through";
    if (tag === "TT") replacement.style.fontFamily = "monospace";
  }
  document.head.replaceChildren();
  const charset = document.createElement("meta");
  charset.setAttribute("charset", "UTF-8");
  const viewport = document.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1.0";
  const policy = document.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = "default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
  const pageTitle = document.createElement("title");
  pageTitle.textContent = title;
  const style = document.createElement("style");
  style.textContent = `body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #161616; background: #f6f6f6; }
    header, main, footer { display: block; } table { border-collapse: collapse; border-spacing: 0; }
    td { padding: 0; } img { max-width: 100%; object-fit: contain; } a { color: #000091; text-decoration: underline; }`;
  document.head.append(charset, viewport, policy, pageTitle, style);
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}
