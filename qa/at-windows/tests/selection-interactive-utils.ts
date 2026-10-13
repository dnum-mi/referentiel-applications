import { expect, type Page, type TestInfo } from "@playwright/test";
import {
  mountProductionScene,
  simulatedNetwork,
  finishInteractive,
} from "./interactive-utils.js";
export type SelectionKind = "tags" | "divisions";
export async function selectionNetwork(page: Page, kind: SelectionKind) {
  const network = await simulatedNetwork(page);
  const extraCalls: {
    method: string;
    pathname: string;
    query: string;
    status: number;
  }[] = [];
  const entries =
    kind === "tags"
      ? [
          { id: "tag-alpha", name: "Alpha" },
          { id: "tag-beta", name: "Beta" },
        ]
      : [
          { id: "division-alpha", label: "Direction Alpha" },
          { id: "division-beta", label: "Direction Beta" },
        ];
  const state = { mode: "ok" as "ok" | "empty" | "error" };
  await page.context().route("**/api/v2/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (
      request.method() !== "GET" ||
      ![
        "/api/v2/tags",
        "/api/v2/business-division",
        "/api/v2/business-division/division-alpha",
        "/api/v2/business-division/division-beta",
      ].includes(url.pathname)
    ) {
      await route.fallback();
      return;
    }
    const byId = url.pathname.includes("/division-");
    const status = !byId && state.mode === "error" ? 500 : 200;
    const json = byId
      ? entries.find((e) => url.pathname.endsWith(e.id))
      : status === 500
        ? { message: "Erreur synthetique" }
        : {
            results: state.mode === "empty" ? [] : entries,
            total: state.mode === "empty" ? 0 : entries.length,
          };
    extraCalls.push({
      method: "GET",
      pathname: url.pathname,
      query: url.search,
      status,
    });
    await route.fulfill({ status, json });
  });
  return { ...network, selectionState: state, selectionCalls: extraCalls };
}
export async function mountSelectionScene(page: Page, kind: SelectionKind) {
  const vue = await page.evaluate(async () => {
    const main = await (await fetch("/src/main.ts")).text();
    const dep = [...main.matchAll(/from\s+["']([^"']+)["']/g)]
      .map((m) => m[1])
      .find((v) => v.includes("/vue.js"));
    if (!dep) throw new Error("Vue missing");
    return dep;
  });
  const component =
    kind === "tags"
      ? "/src/components/common/TagSearchSelect.vue"
      : "/src/components/business-division/BusinessDivisionSearch.vue";
  const prop = kind === "tags" ? "tags" : "businessDivisionIds";
  const initial =
    kind === "tags" ? ["Alpha", "Beta"] : ["division-alpha", "division-beta"];
  const module = `import {defineComponent,h,ref} from ${JSON.stringify(vue)};import Component from ${JSON.stringify(component)};
export default defineComponent({setup(){const selected=ref(${JSON.stringify(initial)});return()=>h('section',[h(Component,{${JSON.stringify(prop)}:selected.value,${JSON.stringify("onUpdate:" + prop)}:value=>{selected.value=value},label:'Directions métier'}),h('button',{type:'button'},'Après la sélection')]);}});`;
  await page.route("**/src/at-search-variants-host.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: module }),
  );
  await mountProductionScene(page, "/src/at-search-variants-host.js");
}
export async function finishSelection(
  page: Page,
  network: Awaited<ReturnType<typeof selectionNetwork>>,
  info: TestInfo,
) {
  network.calls.push(...network.selectionCalls);
  expect(network.calls.every((call) => call.method === "GET")).toBe(true);
  await finishInteractive(page, network, info);
}

declare global {
  interface Window {
    __rgaaHeaderPath?: () => string;
  }
}

export async function mountHeaderSelection(page: Page) {
  const deps = await page.evaluate(async () => {
    const source = await (await fetch("/src/main.ts")).text();
    const router = await (await fetch("/src/router/index.ts")).text();
    const imports = [
      ...`${source}\n${router}`.matchAll(/from\s+["']([^"']+)["']/g),
    ].map((match) => match[1]);
    const vue = imports.find((value) => value.includes("/vue.js"));
    const routing = imports.find((value) => value.includes("/vue-router.js"));
    if (!vue || !routing)
      throw new Error("Real Vue/router dependencies unavailable.");
    return { vue, routing };
  });
  const module = `import {defineComponent,h} from ${JSON.stringify(deps.vue)};
import {useRouter} from ${JSON.stringify(deps.routing)};
import SearchHeader from '/src/components/search/SearchHeader.vue';
export default defineComponent({setup(){const router=useRouter();window.__rgaaHeaderPath=()=>router.currentRoute.value.path;return()=>h(SearchHeader);}});`;
  await page.route("**/src/at-header-selection-host.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: module }),
  );
  await mountProductionScene(page, "/src/at-header-selection-host.js");
}
