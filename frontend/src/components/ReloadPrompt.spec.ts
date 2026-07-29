import { DsfrButton, VIcon } from "@gouvminint/vue-dsfr";

import { cleanup, fireEvent, render } from "@testing-library/vue";

import ReloadPrompt from "./ReloadPrompt.vue";

vi.mock("virtual:pwa-register/vue", () => {
  return {
    useRegisterSW() {
      return {
        offlineReady: true,
        needRefresh: false,
        updateServiceWorker: vi.fn(),
      };
    },
  };
});

describe("reloadPrompt", () => {
  afterEach(() => cleanup());

  it("should render ReloadPrompt with right content", async () => {
    // Given

    // When
    const { container, getByRole } = render(ReloadPrompt, {
      global: {
        components: {
          DsfrButton,
          VIcon,
        },
      },
      props: {
        offlineReady: true,
      },
    });

    const navEl = getByRole("alert");
    const buttons = container.querySelectorAll("button");

    // Then
    expect(navEl.tagName).toBe("DIV");
    expect(buttons).toHaveLength(1);
    expect(navEl).toHaveClass("new-content-wrapper");
  });

  it("should render ReloadPrompt with need refresh", async () => {
    // Given

    // When
    const { container, getAllByRole } = render(ReloadPrompt, {
      global: {
        components: {
          DsfrButton,
          VIcon,
        },
      },
      props: {
        needRefresh: true,
      },
    });

    const navEl = getAllByRole("alert")[0];
    const buttons = container.querySelectorAll("button");

    // Then
    expect(navEl.tagName).toBe("DIV");
    expect(buttons).toHaveLength(2);
    expect(navEl).toHaveClass("new-content-wrapper");
  });

  it("should emit updateServiceWorker when clicking on reload button", async () => {
    // Given
    const { getByTestId, emitted } = render(ReloadPrompt, {
      global: { components: { DsfrButton, VIcon } },
      props: { needRefresh: true },
    });

    // When
    await fireEvent.click(getByTestId("reload-refresh-btn"));

    // Then
    expect(emitted("updateServiceWorker")).toHaveLength(1);
  });

  it("should emit close when clicking on close button", async () => {
    // Given
    const { getByTestId, emitted } = render(ReloadPrompt, {
      global: { components: { DsfrButton, VIcon } },
      props: { needRefresh: true },
    });

    // When
    await fireEvent.click(getByTestId("reload-close-btn"));

    // Then
    expect(emitted("close")).toHaveLength(1);
  });
});
