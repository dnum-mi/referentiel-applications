import { cleanup, render } from "@testing-library/vue";
import MaintenanceBanner from "./MaintenanceBanner.vue";

describe("MaintenanceBanner", () => {
  afterEach(cleanup);

  it("informs users that the application is read-only", () => {
    const { getByTestId } = render(MaintenanceBanner, {
      props: { active: true },
    });

    const banner = getByTestId("maintenance-banner");
    expect(banner).toHaveTextContent("Maintenance en cours");
    expect(banner).toHaveTextContent("disponible en consultation");
    expect(banner).toHaveTextContent("créations, modifications et suppressions sont temporairement désactivées");
  });

  it("does not render outside maintenance", () => {
    const { queryByTestId } = render(MaintenanceBanner, {
      props: { active: false },
    });

    expect(queryByTestId("maintenance-banner")).not.toBeInTheDocument();
  });
});
