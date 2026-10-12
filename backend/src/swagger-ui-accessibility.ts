/// <reference lib="dom" />

type SwaggerProps = Record<string, unknown>;
type SwaggerComponent =
  | ((props: SwaggerProps) => unknown)
  | (new (props: SwaggerProps) => { props: SwaggerProps });

type SwaggerGetComponent = (
  name: string,
  ...args: unknown[]
) => SwaggerComponent;

interface SwaggerOperation {
  path: string;
  tag: string;
  operationId: string;
  method: string;
  isDeepLinkingEnabled: boolean;
}

interface SwaggerReact {
  Component: new (props: SwaggerProps) => { props: SwaggerProps };
  createElement(
    component: string | SwaggerComponent,
    props: SwaggerProps,
    ...children: unknown[]
  ): unknown;
  createRef<T>(): { current: T | null };
}

interface SwaggerSystem {
  React: SwaggerReact;
}

// Swagger UI's existing browser bundle; the declaration emits no server code.
declare const SwaggerUIBundle: {
  plugins: { DownloadUrl: (system: SwaggerSystem) => unknown };
};

/** Nest serializes this function into swagger-ui-init.js. Keep it self-contained. */
export function swaggerDownloadUrlPlugin(system: SwaggerSystem) {
  return SwaggerUIBundle.plugins.DownloadUrl(system);
}

/** Official component wrappers, scoped to Swagger UI 5.32's rendered components. */
export function swaggerAccessibilityPlugin(system: SwaggerSystem) {
  const React = system.React;
  let headingIndex = 0;
  let authorizationTrigger: HTMLElement | null = null;

  function wrapAuthorizeButton(Original: SwaggerComponent) {
    return (props: SwaggerProps) =>
      React.createElement(
        "span",
        {
          onClickCapture: (event: { target: EventTarget }) => {
            if (event.target instanceof Element) {
              authorizationTrigger =
                event.target.closest<HTMLButtonElement>("button");
            }
          },
        },
        React.createElement(Original, props),
      );
  }

  function wrapTopbar(Original: SwaggerComponent) {
    return class AccessibleTopbar extends React.Component {
      container = React.createRef<HTMLElement>();
      observer: MutationObserver | null = null;

      updateLabel = () => {
        const container = this.container.current;
        const input = container?.querySelector<HTMLInputElement>(
          "#download-url-input",
        );
        const currentLabel = container?.querySelector<HTMLLabelElement>(
          ".refapp-swagger-url-label",
        );

        if (!input) {
          currentLabel?.remove();
          return;
        }

        if (!currentLabel) {
          const label = input.ownerDocument.createElement("label");
          label.className = "refapp-swagger-url-label";
          label.htmlFor = input.id;
          label.textContent = "URL de la spécification OpenAPI";
          input.before(label);
        }
      };

      componentDidMount() {
        this.updateLabel();
        const container = this.container.current;
        if (!container) return;
        this.observer = new MutationObserver(this.updateLabel);
        this.observer.observe(container, {
          childList: true,
          subtree: true,
        });
      }

      componentWillUnmount() {
        this.observer?.disconnect();
      }

      render() {
        return React.createElement(
          "div",
          { ref: this.container },
          React.createElement(Original, this.props),
        );
      }
    };
  }

  function wrapAuthorizationPopup(Original: SwaggerComponent) {
    return class AccessibleAuthorizationPopup extends React.Component {
      container = React.createRef<HTMLElement>();
      returnFocus = authorizationTrigger ?? document.activeElement;
      background = new Map<
        Element,
        { inert: string | null; hidden: string | null }
      >();

      focusableElements() {
        const container = this.container.current;
        if (!container) return [];

        return Array.from(
          container.querySelectorAll<HTMLElement>(
            'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex], [contenteditable="true"]',
          ),
        ).filter(
          (element) =>
            element.tabIndex >= 0 &&
            !element.matches(":disabled") &&
            !element.closest("[inert]") &&
            element.getClientRects().length > 0 &&
            getComputedStyle(element).visibility !== "hidden",
        );
      }

      focusInside = () => {
        const elements = this.focusableElements();
        const input = elements.find((element) =>
          element.matches("input, select, textarea"),
        );
        (input ?? elements[0] ?? this.container.current)?.focus();
      };

      onKeyDown = (event: KeyboardEvent) => {
        if (
          event.key !== "Tab" ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        const elements = this.focusableElements();
        const index = elements.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();

        if (elements.length === 0) {
          this.container.current?.focus();
        } else {
          // Safari may skip buttons in native Tab order. Include every command.
          const nextIndex = event.shiftKey
            ? index > 0
              ? index - 1
              : elements.length - 1
            : index >= 0 && index < elements.length - 1
              ? index + 1
              : 0;
          elements[nextIndex].focus();
        }
      };

      onFocusIn = (event: FocusEvent) => {
        if (!this.container.current?.contains(event.target as Node)) {
          this.focusInside();
        }
      };

      componentDidMount() {
        const container = this.container.current;
        if (!container) return;
        authorizationTrigger = null;
        const close =
          container.querySelector<HTMLButtonElement>(".close-modal");
        close?.setAttribute("aria-label", "Close");

        // Move focus before hiding the formerly focused trigger from the API.
        this.focusInside();
        let branch: Element = container;
        while (branch.parentElement) {
          const parent = branch.parentElement;
          for (const sibling of Array.from(parent.children)) {
            if (sibling === branch || sibling.matches("script, style, link"))
              continue;
            this.background.set(sibling, {
              inert: sibling.getAttribute("inert"),
              hidden: sibling.getAttribute("aria-hidden"),
            });
            sibling.setAttribute("inert", "");
            sibling.setAttribute("aria-hidden", "true");
          }
          if (parent === document.body) break;
          branch = parent;
        }

        container.addEventListener("keydown", this.onKeyDown);
        document.addEventListener("focusin", this.onFocusIn);
      }

      componentWillUnmount() {
        this.container.current?.removeEventListener("keydown", this.onKeyDown);
        document.removeEventListener("focusin", this.onFocusIn);
        for (const [element, attributes] of this.background) {
          for (const [attribute, value] of [
            ["inert", attributes.inert],
            ["aria-hidden", attributes.hidden],
          ] as const) {
            if (value === null) element.removeAttribute(attribute);
            else element.setAttribute(attribute, value);
          }
        }
        this.background.clear();

        const trigger = this.returnFocus;
        queueMicrotask(() => {
          if (
            trigger instanceof HTMLElement &&
            trigger.isConnected &&
            !trigger.closest("[inert]") &&
            !document.querySelector(".refapp-swagger-auth-dialog")
          ) {
            trigger.focus();
          }
        });
      }

      render() {
        return React.createElement(
          "div",
          {
            ref: this.container,
            className: "refapp-swagger-auth-dialog",
            role: "dialog",
            "aria-modal": "true",
            "aria-label": "Available authorizations",
            tabIndex: -1,
          },
          React.createElement(Original, this.props),
        );
      }
    };
  }

  function wrapResponses(Original: SwaggerComponent) {
    return class AccessibleResponses extends React.Component {
      container = React.createRef<HTMLElement>();
      headers = new Map<HTMLTableCellElement, HTMLTableCellElement>();

      restoreHeaders() {
        // Restore React-owned nodes before its next commit or unmount.
        for (const [header, original] of this.headers) {
          while (header.firstChild) original.appendChild(header.firstChild);
          header.replaceWith(original);
        }
        this.headers.clear();
      }

      updateHeaders() {
        const container = this.container.current;
        if (!container) return;
        for (const table of Array.from(
          container.querySelectorAll(".responses-table"),
        )) {
          table.removeAttribute("role");
          const heading = table
            .closest(".responses-wrapper")
            ?.querySelector<HTMLElement>(".opblock-section-header h4");
          if (heading) {
            heading.id ||= table.id
              ? `${table.id}-heading`
              : `refapp-swagger-responses-heading-${++headingIndex}`;
            table.setAttribute("aria-labelledby", heading.id);
          }
        }
        for (const original of Array.from(
          container.querySelectorAll<HTMLTableCellElement>(
            ".responses-table > thead > tr > td, .responses-table > tbody > tr > td.response-col_status",
          ),
        )) {
          const header = original.ownerDocument.createElement("th");
          for (const attribute of Array.from(original.attributes)) {
            header.setAttribute(attribute.name, attribute.value);
          }
          header.scope = original.closest("thead") ? "col" : "row";
          while (original.firstChild) header.appendChild(original.firstChild);
          original.replaceWith(header);
          this.headers.set(header, original);
        }
      }

      componentDidMount() {
        this.updateHeaders();
      }

      getSnapshotBeforeUpdate() {
        this.restoreHeaders();
        return null;
      }

      componentDidUpdate() {
        this.updateHeaders();
      }

      componentWillUnmount() {
        this.restoreHeaders();
      }

      render() {
        return React.createElement(
          "div",
          { ref: this.container },
          React.createElement(Original, this.props),
        );
      }
    };
  }

  function wrapOperationSummaryPath(Original: SwaggerComponent) {
    return (props: SwaggerProps) => {
      const getComponent = props.getComponent as SwaggerGetComponent;
      const StaticPath = (linkProps: SwaggerProps) =>
        React.createElement("span", { className: "nostyle" }, linkProps.text);
      return React.createElement(Original, {
        ...props,
        getComponent: (name: string, ...args: unknown[]) =>
          name === "DeepLink" ? StaticPath : getComponent(name, ...args),
      });
    };
  }

  function wrapOperationSummary(Original: SwaggerComponent) {
    return (props: SwaggerProps) => {
      const getComponent = props.getComponent as SwaggerGetComponent;
      const operation = (
        props.operationProps as { toObject(): SwaggerOperation }
      ).toObject();
      if (!operation.isDeepLinkingEnabled) {
        return React.createElement(Original, props);
      }
      const Copy = getComponent("CopyToClipboardBtn", true);
      // Match Swagger's createDeepLinkPath, including spaces in operation tags.
      const path = `${operation.tag}/${operation.operationId}`
        .trim()
        .replace(/\s/g, "%20");
      const CopyAndPermalink = (copyProps: SwaggerProps) =>
        React.createElement(
          "span",
          { className: "refapp-swagger-summary-actions" },
          React.createElement(
            "a",
            {
              className: "refapp-swagger-permalink",
              href: `#/${path}`,
              "aria-label": `Lien direct vers ${operation.method.toUpperCase()} ${operation.path}`,
              onClick: (event: MouseEvent) => {
                if (
                  event.button > 0 ||
                  event.altKey ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey
                )
                  return;
                if (props.isShown !== true) (props.toggleShown as () => void)();
              },
            },
            "Lien direct",
          ),
          React.createElement(Copy, copyProps),
        );
      return React.createElement(Original, {
        ...props,
        getComponent: (name: string, ...args: unknown[]) =>
          name === "CopyToClipboardBtn"
            ? CopyAndPermalink
            : getComponent(name, ...args),
      });
    };
  }

  return {
    wrapComponents: {
      Topbar: wrapTopbar,
      authorizeBtn: wrapAuthorizeButton,
      authorizeOperationBtn: wrapAuthorizeButton,
      authorizationPopup: wrapAuthorizationPopup,
      responses: wrapResponses,
      OperationSummaryPath: wrapOperationSummaryPath,
      OperationSummary: wrapOperationSummary,
      Button: (Original: SwaggerComponent) => (props: SwaggerProps) => {
        const label = props["aria-label"];
        const text =
          typeof props.children === "string" ? props.children.trim() : "";
        const ariaLabel =
          text && typeof label === "string" && !label.includes(text)
            ? `${text}: ${label}`
            : label;
        return React.createElement(Original, {
          ...props,
          "aria-label": ariaLabel,
        });
      },
    },
  };
}

export const swaggerAccessibilityCss = `
  #swagger-ui {
    --refapp-swagger-link: #000091;
    --refapp-swagger-success: #0b6b43;
    --refapp-swagger-danger: #b42318;
    --refapp-swagger-focus: #000091;
  }
  html.dark-mode #swagger-ui {
    --refapp-swagger-link: #cacafb;
    --refapp-swagger-success: #9ce5c1;
    --refapp-swagger-danger: #ffb4ab;
    --refapp-swagger-focus: #cacafb;
  }
  #swagger-ui .swagger-ui a { color: var(--refapp-swagger-link); }
  #swagger-ui .btn.authorize {
    color: var(--refapp-swagger-success);
    border-color: var(--refapp-swagger-success);
    transition: box-shadow .2s;
  }
  #swagger-ui .btn.authorize svg { color: currentColor; }
  #swagger-ui .btn.execute {
    background-color: #005a9c;
    border-color: #005a9c;
    color: #fff;
  }
  #swagger-ui .btn.cancel {
    color: var(--refapp-swagger-danger);
    border-color: var(--refapp-swagger-danger);
    transition: box-shadow .2s;
  }
  #swagger-ui .info .title small { background: #4b5563; color: #fff; }
  #swagger-ui .info .title small.version-stamp { background: #166534; }
  #swagger-ui .opblock .opblock-summary-method { background: #4b5563; color: #fff; }
  #swagger-ui .opblock-get .opblock-summary-method { background: #005a9c; }
  #swagger-ui .opblock-post .opblock-summary-method { background: #166534; }
  #swagger-ui .opblock-put .opblock-summary-method { background: #8a4b00; }
  #swagger-ui .opblock-delete .opblock-summary-method { background: #b42318; }
  #swagger-ui .opblock-patch .opblock-summary-method { background: #6b21a8; }
  #swagger-ui .opblock-head .opblock-summary-method { background: #006b66; }
  #swagger-ui .opblock-options .opblock-summary-method { background: #3730a3; }
  #swagger-ui .refapp-swagger-summary-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 4px;
  }
  #swagger-ui .refapp-swagger-permalink {
    font-size: 12px;
    text-align: center;
    text-decoration: underline;
  }
  #swagger-ui .responses-table th.response-col_status {
    min-width: 6em;
  }
  #swagger-ui .responses-table > tbody > tr > th[scope="row"] {
    padding: 10px 0;
    vertical-align: top;
    text-align: left;
    font-weight: normal;
  }
  #swagger-ui .topbar .download-url-wrapper { flex-wrap: wrap; }
  #swagger-ui .topbar .download-url-button { background: #166534; color: #fff; }
  #swagger-ui .topbar .refapp-swagger-url-label {
    color: #fff;
    flex-basis: 100%;
    font-family: sans-serif;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  #swagger-ui .topbar .download-url-wrapper input[type="text"] {
    flex: 1 1 12rem;
    min-width: 0;
    width: auto;
  }
  #swagger-ui .refapp-swagger-auth-dialog {
    position: fixed;
    inset: 0;
    z-index: 9998;
  }
  #swagger-ui .dialog-ux .modal-ux {
    max-height: calc(100dvh - 2rem);
    min-width: 0;
    width: min(650px, calc(100% - 2rem));
  }
  #swagger-ui .dialog-ux .modal-ux-content {
    max-height: calc(100dvh - 7rem);
  }
  #swagger-ui .refapp-swagger-auth-dialog .checkbox {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  #swagger-ui .refapp-swagger-auth-dialog .checkbox input[type="checkbox"] {
    display: block;
    appearance: auto;
    flex: none;
    width: 16px;
    height: 16px;
    margin: 3px 0 0;
  }
  #swagger-ui .refapp-swagger-auth-dialog .checkbox input[type="checkbox"] + label > .item {
    display: none;
  }
  #swagger-ui .swagger-ui :is(button, a, input, select, textarea):focus-visible {
    outline: 3px solid var(--refapp-swagger-focus);
    outline-offset: 2px;
  }
  #swagger-ui .topbar :focus-visible { outline-color: #fff; }
`;
