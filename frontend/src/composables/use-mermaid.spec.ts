import { enableAutoUnmount, mount } from "@vue/test-utils";
import mermaid from "mermaid";
import { useMermaid, vUseMermaid } from "./use-mermaid";

enableAutoUnmount(afterEach);
const hosts: HTMLElement[] = [];
const geometryDescriptors = new Map<string, PropertyDescriptor | undefined>();

beforeAll(() => {
  // Seules les mesures absentes de jsdom sont simulées, Mermaid et DOMPurify restent réels.
  for (const method of ["getBBox", "getComputedTextLength"]) {
    geometryDescriptors.set(method, Object.getOwnPropertyDescriptor(SVGElement.prototype, method));
  }
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value(this: SVGElement) {
      return { x: 0, y: 0, width: Math.max(20, (this.textContent?.length ?? 0) * 8), height: 20 };
    },
  });
  Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    value(this: SVGElement) {
      return Math.max(20, (this.textContent?.length ?? 0) * 8);
    },
  });
});

afterAll(() => {
  for (const [method, descriptor] of geometryDescriptors) {
    if (descriptor) Object.defineProperty(SVGElement.prototype, method, descriptor);
    else Reflect.deleteProperty(SVGElement.prototype, method);
  }
});

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts.length = 0;
  vi.restoreAllMocks();
});

function createHost() {
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  return host;
}

describe("Mermaid — libellés, alternatives et nettoyage", () => {
  it("conserve les libellés et rend la source consultable dans la directive de l'aperçu", async () => {
    const code = "flowchart TB\nA[Application A] --> B[Application B]";
    const wrapper = mount(
      {
        directives: { useMermaid: vUseMermaid },
        setup: () => ({ code }),
        template: '<div v-use-mermaid><pre><code class="language-mermaid">{{ code }}</code></pre></div>',
      },
      { attachTo: document.body },
    );
    await vi.waitFor(() => expect(wrapper.find("svg").exists()).toBe(true));
    const image = wrapper.get("svg").element;
    expect(image).toHaveAttribute("role", "img");
    expect(image).toHaveAccessibleName(/Application A/);
    expect(image).toHaveAccessibleName(/Application B/);
    expect(
      wrapper
        .findAll("svg text")
        .map((text) => text.text())
        .join(" "),
    ).toContain("Application A");
    expect(
      wrapper
        .findAll("svg text")
        .map((text) => text.text())
        .join(" "),
    ).toContain("Application B");
    expect(wrapper.find("foreignObject").exists()).toBe(false);
    expect(wrapper.get("details pre").text()).toBe(code);
    expect(image.getAttribute("aria-details")).toBe(wrapper.get("details").attributes("id"));
  });

  it("préserve le titre et la description donnés par l'auteur dans le rendu nettoyé", async () => {
    const host = createHost();
    await useMermaid().renderDiagram(
      host,
      "flowchart TB\naccTitle: Flux applicatif\naccDescr: Application A transmet des données à Application B.\nA[Application A] --> B[Application B]",
    );
    const image = host.querySelector("svg");
    expect(image).toHaveAccessibleName("Flux applicatif");
    expect(image).toHaveAccessibleDescription("Application A transmet des données à Application B.");
    expect(host.querySelector("details p")).toHaveTextContent("Application A transmet des données à Application B.");
    expect(host.querySelector("foreignObject")).toBeNull();
  });

  it("empêche une directive Mermaid de réactiver les libellés HTML", async () => {
    const host = createHost();
    await useMermaid().renderDiagram(
      host,
      "%%{init: {'htmlLabels': true, 'flowchart': {'htmlLabels': true}}}%%\nflowchart TB\nA[Application A] --> B[Application B]",
    );
    expect(host.querySelector("svg")).toHaveAccessibleName(/Application A/);
    expect(host.querySelector("svg")).toHaveAccessibleName(/Application B/);
    expect(host.querySelector("foreignObject")).toBeNull();
  });

  it("retire scripts, objets HTML, attributs exécutables et liens JavaScript du SVG produit", async () => {
    vi.spyOn(mermaid, "render").mockResolvedValueOnce({
      diagramType: "flowchart-v2",
      svg: '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject><img src="x" onerror="alert(1)" /></foreignObject><a href="javascript:alert(1)"><text>Application légitime</text></a></svg>',
    });
    const host = createHost();
    await useMermaid().renderDiagram(host, "flowchart TB\nA[Application légitime]");
    const image = host.querySelector("svg");
    expect(image).toHaveAccessibleName("Diagramme : Application légitime");
    expect(host.querySelector("script, foreignObject, img, [onload], [onerror]")).toBeNull();
    expect(host.querySelector("a")).not.toHaveAttribute("href");
  });
});
