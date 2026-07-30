import { render } from "@testing-library/vue";
import AccessibilityPage from "./AccessibilityPage.vue";

describe("AccessibilityPage", () => {
  it("affiche les résultats officiels de l'audit RGAA initial", () => {
    const { getByTestId } = render(AccessibilityPage);

    const page = getByTestId("accessibility-page");

    expect(page).toHaveTextContent("52,54 %");
    expect(page).toHaveTextContent("31 critères conformes");
    expect(page).toHaveTextContent("28 critères non conformes");
    expect(page).toHaveTextContent("partiellement conforme");
    expect(page).toHaveTextContent("05 juin 2026");
  });
});
