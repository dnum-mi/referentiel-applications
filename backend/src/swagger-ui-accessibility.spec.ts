import type { INestApplication } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { Test } from "@nestjs/testing";
import request from "supertest";
import {
  parseJsonConfigFileContent,
  readConfigFile,
  sys,
  transpileModule,
} from "typescript";
import { setupSwagger } from "./swagger-config";
import {
  swaggerAccessibilityPlugin,
  swaggerDownloadUrlPlugin,
} from "./swagger-ui-accessibility";

type Props = Record<string, unknown>;
interface RenderedElement {
  component: unknown;
  props: Props;
  children: unknown[];
}

function createReactFixture() {
  return {
    Component: class {
      constructor(public props: Props) {}
    },
    createElement(component: unknown, props: Props, ...children: unknown[]) {
      return { component, props, children };
    },
    createRef<T>() {
      return { current: null as T | null };
    },
  };
}

function browserTestContext(context: Record<string, unknown> = {}) {
  // Istanbul inserts calls to a file-local counter into serialized functions.
  // Share only those counters with the sandbox so these behavior tests still
  // contribute coverage. The production compilation is tested separately below
  // without any instrumentation runtime or other server globals.
  const source = swaggerAccessibilityPlugin.toString();
  const coverage = (
    globalThis as typeof globalThis & {
      __coverage__?: Record<string, unknown>;
    }
  ).__coverage__;
  const counters: Record<string, () => unknown> = {};
  for (const [, name] of source.matchAll(/\b(cov_\w+)\(\)/g)) {
    const fileCoverage =
      coverage?.[require.resolve("./swagger-ui-accessibility")];
    if (!fileCoverage)
      throw new Error("Missing Istanbul counter for Swagger plugin");
    counters[name] = () => fileCoverage;
  }
  return { ...context, ...counters };
}

describe("Swagger accessibility plugin", () => {
  it("marks authored French and English text without forcing a language on Swagger's interface", () => {
    const specification = {
      toJS: jest.fn().mockReturnValue({
        info: { description: "Texte français" },
        paths: { "/test": { get: { summary: "Read the application" } } },
        "x-refapp-documentation-language": {
          default: "fr",
          englishTexts: ["Read the application"],
        },
      }),
    };
    const plugin = swaggerAccessibilityPlugin({
      React: createReactFixture(),
      specSelectors: { specJson: () => specification },
    });
    const Original = () => null;
    const Markdown = plugin.wrapComponents.Markdown(Original);
    expect(
      (Markdown({ source: "Texte\n français" }) as RenderedElement).props.lang,
    ).toBe("fr");
    expect(
      (Markdown({ source: "Read the application" }) as RenderedElement).props
        .lang,
    ).toBe("en");
    expect(
      (Markdown({ source: "Swagger interface help" }) as RenderedElement)
        .component,
    ).toBe(Original);
    expect(specification.toJS).toHaveBeenCalledTimes(1);
  });

  it("leaves a third-party specification without RefApp language metadata unchanged", () => {
    const plugin = swaggerAccessibilityPlugin({
      React: createReactFixture(),
      specSelectors: {
        specJson: () => ({
          toJS: () => ({ info: { description: "English documentation" } }),
        }),
      },
    });
    const Original = () => null;
    const Markdown = plugin.wrapComponents.Markdown(Original);
    expect(
      (Markdown({ source: "English documentation" }) as RenderedElement)
        .component,
    ).toBe(Original);
  });

  it("makes API groups and the global schema section sibling level-two headings", () => {
    const plugin = swaggerAccessibilityPlugin({ React: createReactFixture() });
    const Layout = plugin.wrapComponents.BaseLayout(() => null);
    const layout = new Layout({});
    const apiGroup = { textContent: "Applications", setAttribute: jest.fn() };
    const schemas = { textContent: "Schemas", setAttribute: jest.fn() };
    layout.container.current = {
      querySelectorAll: (selector: string) =>
        selector.includes("opblock-tag") ? [apiGroup, schemas] : [],
    } as unknown as HTMLElement;
    layout.componentDidUpdate();
    for (const heading of [apiGroup, schemas]) {
      expect(heading.setAttribute).toHaveBeenCalledWith("role", "heading");
      expect(heading.setAttribute).toHaveBeenCalledWith("aria-level", "2");
    }
    expect(apiGroup.textContent).toBe("Applications");
    expect(schemas.textContent).toBe("Schemas");
  });

  it.each([true, false])(
    "uses the document's complete sprite only when already provided: %s",
    (provided) => {
      const pluginFactory = runInNewContext(
        `(${swaggerAccessibilityPlugin.toString()})`,
        browserTestContext({
          document: {
            getElementById: () =>
              provided ? { tagName: "symbol", closest: () => null } : null,
          },
        }),
      ) as typeof swaggerAccessibilityPlugin;
      const plugin = pluginFactory({ React: createReactFixture() });
      const Original = () => null;
      const Assets = plugin.wrapComponents.SvgAssets(Original);
      const rendered = Assets({});
      if (provided) expect(rendered).toBeNull();
      else expect((rendered as RenderedElement).component).toBe(Original);
    },
  );

  it("reassociates parameter headings and new headers after an expansion update", () => {
    const plugin = swaggerAccessibilityPlugin({ React: createReactFixture() });
    const Parameters = plugin.wrapComponents.parameters(() => null);
    const parameters = new Parameters({});
    const heading = { id: "" };
    const headers = [{ scope: "" }, { scope: "" }];
    const table = {
      closest: () => ({ querySelector: () => heading }),
      setAttribute: jest.fn(),
      querySelectorAll: () => headers,
    };
    parameters.container.current = {
      querySelectorAll: () => [table],
    } as unknown as HTMLElement;
    parameters.componentDidMount();
    const headingId = heading.id;
    expect(headingId).toBeTruthy();
    expect(table.setAttribute).toHaveBeenCalledWith(
      "aria-labelledby",
      headingId,
    );
    expect(headers.map((header) => header.scope)).toEqual(["col", "col"]);
    headers.splice(0, headers.length, { scope: "" }, { scope: "" });
    parameters.componentDidUpdate();
    expect(heading.id).toBe(headingId);
    expect(table.setAttribute).toHaveBeenLastCalledWith(
      "aria-labelledby",
      headingId,
    );
    expect(headers.map((header) => header.scope)).toEqual(["col", "col"]);
  });
  it.each(["Apply credentials", "Apply given OAuth2 credentials"])(
    "keeps the visible Authorize text in the name %s without changing the action",
    (name) => {
      const plugin = swaggerAccessibilityPlugin({
        React: createReactFixture(),
      });
      const action = jest.fn();
      const Original = () => null;
      const Button = plugin.wrapComponents.Button(Original);
      const rendered = Button({
        children: "Authorize",
        "aria-label": name,
        onClick: action,
        type: "submit",
      }) as RenderedElement;

      expect(rendered.component).toBe(Original);
      expect(rendered.props["aria-label"]).toBe(`Authorize: ${name}`);
      expect(rendered.props.children).toBe("Authorize");
      expect(rendered.props.onClick).toBe(action);
      expect(rendered.props.type).toBe("submit");
    },
  );

  it("preserves existing names that already contain the visible text", () => {
    const plugin = swaggerAccessibilityPlugin({ React: createReactFixture() });
    const Button = plugin.wrapComponents.Button(() => null);
    const rendered = Button({
      children: "Close",
      "aria-label": "Close authorizations",
    }) as RenderedElement;
    expect(rendered.props["aria-label"]).toBe("Close authorizations");
  });

  it("renders the operation path as static text inside the expansion button", () => {
    const plugin = swaggerAccessibilityPlugin({ React: createReactFixture() });
    const getComponent = jest.fn().mockReturnValue(() => null);
    const Path = plugin.wrapComponents.OperationSummaryPath(() => null);
    const rendered = Path({ getComponent }) as RenderedElement;
    const lookup = rendered.props.getComponent as (
      name: string,
    ) => (props: Props) => RenderedElement;
    const path = lookup("DeepLink")({
      text: ["/applications", "/{id}"],
      path: "App/getApplication",
    });
    expect(path.component).toBe("span");
    expect(path.props).not.toHaveProperty("href");
    expect(path.children).toEqual([["/applications", "/{id}"]]);
    lookup("ArrowDownIcon");
    expect(getComponent).toHaveBeenCalledWith("ArrowDownIcon");
  });

  it("places the direct link next to the original copy command while preserving expansion", () => {
    const plugin = swaggerAccessibilityPlugin({ React: createReactFixture() });
    const Copy = () => null;
    const getComponent = jest.fn().mockReturnValue(Copy);
    const toggleShown = jest.fn();
    const Summary = plugin.wrapComponents.OperationSummary(() => null);
    const rendered = Summary({
      getComponent,
      toggleShown,
      operationProps: {
        toObject: () => ({
          tag: "Campaigns admin",
          operationId: "startCampaign",
          method: "post",
          path: "/campaigns",
          isDeepLinkingEnabled: true,
        }),
      },
    }) as RenderedElement;
    const content = rendered.props.content as RenderedElement;
    const lookup = content.props.getComponent as (
      name: string,
    ) => (props: Props) => RenderedElement;
    const actions = lookup("CopyToClipboardBtn")({ textToCopy: "/campaigns" });
    const link = actions.children[0] as RenderedElement;
    const copy = actions.children[1] as RenderedElement;
    expect(link.component).toBe("a");
    expect(link.props.href).toBe("#/Campaigns%20admin/startCampaign");
    expect(link.props["aria-label"]).toBe("Lien direct vers POST /campaigns");
    expect(link.children).toEqual(["Lien direct"]);
    const follow = link.props.onClick as (event: MouseEvent) => void;
    follow({ button: 0 } as MouseEvent);
    expect(toggleShown).toHaveBeenCalledTimes(1);
    follow({ button: 0, ctrlKey: true } as MouseEvent);
    expect(toggleShown).toHaveBeenCalledTimes(1);
    expect(copy).toEqual({
      component: Copy,
      props: { textToCopy: "/campaigns" },
      children: [],
    });
    expect(content.props.toggleShown).toBe(toggleShown);
  });

  it("names the dialog and wraps the original authorizations with their original props", () => {
    const plugin = runInNewContext(
      `(${swaggerAccessibilityPlugin.toString()})`,
      browserTestContext({
        document: { activeElement: null },
      }),
    )({ React: createReactFixture() }) as ReturnType<
      typeof swaggerAccessibilityPlugin
    >;
    const Original = () => null;
    const Popup = plugin.wrapComponents.authorizationPopup(Original);
    const props = { authActions: { showDefinitions: jest.fn() } };
    const popup = new Popup(props);
    const rendered = popup.render() as RenderedElement;

    expect(rendered.props).toMatchObject({
      role: "dialog",
      "aria-label": "Available authorizations",
      "aria-modal": "true",
      tabIndex: -1,
    });
    expect(rendered.children).toEqual([
      { component: Original, props, children: [] },
    ]);
  });

  it("remembers the clicked trigger even when Safari leaves focus on another element", () => {
    class ElementFixture {
      constructor(private button?: ElementFixture) {}
      closest() {
        return this.button ?? this;
      }
    }
    const button = new ElementFixture();
    const icon = new ElementFixture(button);
    const plugin = runInNewContext(
      `(${swaggerAccessibilityPlugin.toString()})`,
      browserTestContext({
        document: { activeElement: { id: "previous-link" } },
        Element: ElementFixture,
      }),
    )({ React: createReactFixture() }) as ReturnType<
      typeof swaggerAccessibilityPlugin
    >;
    const Authorize = plugin.wrapComponents.authorizeBtn(() => null);
    const rendered = Authorize({}) as RenderedElement;
    const capture = rendered.props.onClickCapture as (event: {
      target: unknown;
    }) => void;
    capture({ target: icon });
    const Popup = plugin.wrapComponents.authorizationPopup(() => null);
    expect(new Popup({}).returnFocus).toBe(button);
  });

  it("navigates every dialog command and wraps Tab and Shift+Tab at the boundaries", () => {
    const first = { focus: jest.fn() } as unknown as HTMLElement;
    const middle = { focus: jest.fn() } as unknown as HTMLElement;
    const last = { focus: jest.fn() } as unknown as HTMLElement;
    const document = { activeElement: last };
    const plugin = runInNewContext(
      `(${swaggerAccessibilityPlugin.toString()})`,
      browserTestContext({
        document,
      }),
    )({ React: createReactFixture() }) as ReturnType<
      typeof swaggerAccessibilityPlugin
    >;
    const Popup = plugin.wrapComponents.authorizationPopup(() => null);
    const popup = new Popup({});
    popup.focusableElements = () => [first, middle, last];
    const preventDefault = jest.fn();
    const event = (key: string, shiftKey = false) =>
      ({ key, shiftKey, preventDefault }) as unknown as KeyboardEvent;

    popup.onKeyDown(event("Tab"));
    expect(first.focus).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);

    document.activeElement = first;
    popup.onKeyDown(event("Tab", true));
    expect(last.focus).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(2);

    document.activeElement = middle;
    popup.onKeyDown(event("Tab"));
    popup.onKeyDown(event("Tab", true));
    popup.onKeyDown(event("Escape"));
    expect(last.focus).toHaveBeenCalledTimes(2);
    expect(first.focus).toHaveBeenCalledTimes(2);
    expect(preventDefault).toHaveBeenCalledTimes(4);
    expect(middle.focus).not.toHaveBeenCalled();
  });

  it("restores the original background attributes and returns focus after unmount", async () => {
    class ElementFixture {
      isConnected = true;
      focus = jest.fn();
      closest = jest.fn().mockReturnValue(null);
      attributes = new Map<string, string>();
      setAttribute(name: string, value: string) {
        this.attributes.set(name, value);
      }
      removeAttribute(name: string) {
        this.attributes.delete(name);
      }
    }

    const trigger = new ElementFixture();
    const background = new ElementFixture();
    background.setAttribute("inert", "");
    background.setAttribute("aria-hidden", "true");
    const document = {
      activeElement: trigger,
      removeEventListener: jest.fn(),
      querySelector: jest.fn().mockReturnValue(null),
    };
    const plugin = runInNewContext(
      `(${swaggerAccessibilityPlugin.toString()})`,
      browserTestContext({
        document,
        HTMLElement: ElementFixture,
        queueMicrotask,
      }),
    )({ React: createReactFixture() }) as ReturnType<
      typeof swaggerAccessibilityPlugin
    >;
    const Popup = plugin.wrapComponents.authorizationPopup(() => null);
    const popup = new Popup({});
    popup.background.set(background as unknown as Element, {
      inert: null,
      hidden: "false",
    });
    popup.componentWillUnmount();
    await Promise.resolve();

    expect(background.attributes.has("inert")).toBe(false);
    expect(background.attributes.get("aria-hidden")).toBe("false");
    expect(popup.background.size).toBe(0);
    expect(trigger.focus).toHaveBeenCalledTimes(1);
    expect(document.removeEventListener).toHaveBeenCalledWith(
      "focusin",
      popup.onFocusIn,
    );
  });

  it("serializes the production TypeScript output without any server closure or coverage runtime", () => {
    const configPath = resolve(__dirname, "../tsconfig.json");
    const config = readConfigFile(configPath, sys.readFile);
    expect(config.error).toBeUndefined();
    const parsed = parseJsonConfigFileContent(
      config.config,
      sys,
      resolve(__dirname, ".."),
    );
    const compiled = transpileModule(
      readFileSync(resolve(__dirname, "swagger-ui-accessibility.ts"), "utf8"),
      { compilerOptions: parsed.options },
    );
    const exports: Record<string, unknown> = {};
    runInNewContext(compiled.outputText, { exports });
    const serialized =
      exports.swaggerAccessibilityPlugin as typeof swaggerAccessibilityPlugin;
    const createStandalonePlugin = runInNewContext(
      `(${serialized.toString()})`,
      {
        document: { activeElement: null },
      },
    ) as typeof swaggerAccessibilityPlugin;
    const plugin = createStandalonePlugin({ React: createReactFixture() });
    const Popup = plugin.wrapComponents.authorizationPopup(() => null);
    const dialog = new Popup({}).render() as RenderedElement;
    expect(dialog.props.role).toBe("dialog");
    expect(dialog.props["aria-label"]).toBe("Available authorizations");
    const Button = plugin.wrapComponents.Button(() => null);
    const button = Button({
      children: "Authorize",
      "aria-label": "Apply credentials",
    }) as RenderedElement;
    expect(button.props["aria-label"]).toBe("Authorize: Apply credentials");

    const download =
      exports.swaggerDownloadUrlPlugin as typeof swaggerDownloadUrlPlugin;
    const DownloadUrl = jest.fn().mockReturnValue({ statePlugins: {} });
    const standaloneDownload = runInNewContext(`(${download.toString()})`, {
      SwaggerUIBundle: { plugins: { DownloadUrl } },
    }) as typeof swaggerDownloadUrlPlugin;
    const system = { React: createReactFixture() };
    expect(standaloneDownload(system)).toEqual({ statePlugins: {} });
    expect(DownloadUrl).toHaveBeenCalledWith(system);
  });
});

describe("Swagger accessibility integration", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({}).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v2");
    setupSwagger(
      app,
      {
        host: "localhost",
        port: 3500,
        writeYaml: false,
        onlyWriteSwagger: false,
      },
      {
        configUrl:
          "https://identity.example.test/.well-known/openid-configuration",
        clientId: "api-docs",
      },
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("serves the API-specific title and the visible label and dialog styles", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v2/swagger/")
      .expect(200);
    expect(response.text).toContain(
      "<title>Documentation API — Référentiel Applications</title>",
    );
    expect(response.text).toContain(".refapp-swagger-url-label");
    expect(response.text).toContain(".refapp-swagger-auth-dialog");
  });

  it("serves executable standalone plugins and preserves DownloadUrl and OAuth2 settings", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v2/swagger/swagger-ui-init.js")
      .expect(200);
    const initOAuth = jest.fn();
    const downloadPlugin = jest.fn().mockReturnValue({ statePlugins: {} });
    const createUi = Object.assign(jest.fn().mockReturnValue({ initOAuth }), {
      plugins: { DownloadUrl: downloadPlugin },
      presets: { apis: {} },
    });
    const window = {
      location: { search: "", origin: "http://localhost:3500" },
      onload: null as (() => void) | null,
    };
    runInNewContext(
      response.text,
      browserTestContext({
        window,
        SwaggerUIBundle: createUi,
        SwaggerUIStandalonePreset: {},
      }),
    );
    window.onload();
    const options = createUi.mock.calls[0][0] as {
      plugins: Array<
        (system: Parameters<typeof swaggerAccessibilityPlugin>[0]) => unknown
      >;
      usePkceWithAuthorizationCodeGrant: boolean;
      oauth2RedirectUrl: string;
    };
    const system = { React: createReactFixture() };
    options.plugins[0](system);
    const accessibility = options.plugins[1](system) as ReturnType<
      typeof swaggerAccessibilityPlugin
    >;

    expect(downloadPlugin).toHaveBeenCalledWith(system);
    expect(Object.keys(accessibility.wrapComponents)).toEqual([
      "Topbar",
      "authorizeBtn",
      "authorizeOperationBtn",
      "authorizationPopup",
      "responses",
      "parameters",
      "SvgAssets",
      "BaseLayout",
      "Markdown",
      "OperationSummaryPath",
      "OperationSummary",
      "Button",
    ]);
    expect(options.usePkceWithAuthorizationCodeGrant).toBe(true);
    expect(options.oauth2RedirectUrl).toBe(
      "http://localhost:3500/api/v2/swagger/oauth2-redirect.html",
    );
    expect(initOAuth).toHaveBeenCalledWith({
      scopes: ["openid", "profile"],
      clientId: "api-docs",
    });
  });
});
