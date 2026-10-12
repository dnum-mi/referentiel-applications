import type { Directive } from "vue";
import mermaid from "mermaid";
import DOMPurify from "dompurify";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  // Les libellés restent du texte SVG ; aucun foreignObject n'est autorisé au nettoyage.
  htmlLabels: false,
  secure: [...(mermaid.mermaidAPI.getConfig().secure ?? []), "htmlLabels"],
  flowchart: {
    useMaxWidth: false,
    htmlLabels: false,
    nodeSpacing: 100,
    rankSpacing: 100,
  },
});

export const vUseMermaid: Directive<HTMLElement> = {
  mounted: renderMermaid,
  updated: renderMermaid,
};

let diagramNumber = 0;
const svgNamespace = "http://www.w3.org/2000/svg";

async function createDiagram(code: string) {
  const id = `mermaid-${Date.now()}-${++diagramNumber}`;
  const { svg } = await mermaid.render(id, code);
  const container = document.createElement("div");
  container.className = "mermaid-container";
  container.innerHTML = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
  const image = container.querySelector("svg");
  if (!image) throw new Error("Le diagramme ne contient pas d’image SVG valide.");

  const labels = [
    ...new Set(Array.from(image.querySelectorAll("text"), (text) => text.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean)),
  ];
  const title = image.querySelector<SVGTitleElement>(":scope > title") ?? document.createElementNS(svgNamespace, "title");
  title.id = `${id}-title`;
  title.textContent = title.textContent?.trim() || (labels.length ? `Diagramme : ${labels.slice(0, 3).join(", ")}` : "Diagramme Mermaid");
  if (!title.parentElement) image.prepend(title);
  image.setAttribute("role", "img");
  image.removeAttribute("aria-roledescription");
  image.removeAttribute("aria-label");
  image.setAttribute("aria-labelledby", title.id);

  const description = image.querySelector<SVGDescElement>(":scope > desc") ?? document.createElementNS(svgNamespace, "desc");
  const authorDescription = description.textContent?.trim();
  description.id = `${id}-description`;
  description.textContent = authorDescription || "Une version textuelle du diagramme est disponible après l’image.";
  if (!description.parentElement) image.prepend(description);
  image.setAttribute("aria-describedby", description.id);

  const transcription = document.createElement("details");
  transcription.id = `${id}-source`;
  const summary = document.createElement("summary");
  summary.textContent = "Description et source du diagramme";
  transcription.append(summary);
  if (authorDescription) {
    const paragraph = document.createElement("p");
    paragraph.textContent = authorDescription;
    transcription.append(paragraph);
  }
  const source = document.createElement("pre");
  source.textContent = code;
  transcription.append(source);
  image.setAttribute("aria-details", transcription.id);
  container.append(transcription);
  return container;
}

async function renderMermaid(el: HTMLElement) {
  const codeBlocks = el.querySelectorAll<HTMLElement>("code.language-mermaid");

  for (const codeBlock of codeBlocks) {
    const code = codeBlock.textContent || "";

    try {
      const container = await createDiagram(code);
      if (!el.contains(codeBlock)) continue;

      const parent = codeBlock.parentElement;
      if (parent?.tagName === "PRE") {
        parent.replaceWith(container);
      } else {
        codeBlock.replaceWith(container);
      }
    } catch (error) {
      console.error("Mermaid rendering error:", error);
    }
  }
}

export function useMermaid() {
  const renderDiagram = async (element: HTMLElement, code: string): Promise<void> => {
    try {
      const container = await createDiagram(code);
      element.replaceChildren(...container.childNodes);
    } catch (error) {
      console.error("Mermaid rendering error:", error);
      const pre = document.createElement("pre");
      pre.className = "mermaid-error";
      pre.textContent = String(error);
      element.replaceChildren(pre);
    }
  };

  return {
    renderDiagram,
  };
}
