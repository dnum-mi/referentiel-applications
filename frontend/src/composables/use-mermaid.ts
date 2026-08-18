import type { Directive } from "vue";
import mermaid from "mermaid";
import DOMPurify from "dompurify";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    nodeSpacing: 100,
    rankSpacing: 100,
  },
});

export const vUseMermaid: Directive = {
  mounted(el: HTMLElement) {
    renderMermaid(el);
  },
  updated(el: HTMLElement) {
    renderMermaid(el);
  },
};

async function renderMermaid(el: HTMLElement) {
  const codeBlocks = el.querySelectorAll("code.language-mermaid, pre > code.language-mermaid");

  for (let i = 0; i < codeBlocks.length; i++) {
    const codeBlock = codeBlocks[i] as HTMLElement;
    const code = codeBlock.textContent || "";

    try {
      const id = `mermaid-${Date.now()}-${i}`;
      const { svg } = await mermaid.render(id, code);

      const container = document.createElement("div");
      container.className = "mermaid-container";
      container.innerHTML = DOMPurify.sanitize(svg);

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
      const id = `mermaid-${Date.now()}`;
      const { svg } = await mermaid.render(id, code);
      element.innerHTML = DOMPurify.sanitize(svg);
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
