import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { ref } from "vue";
import type { Filters } from "@/composables/use-application-search";
import HomologationFilter from "./HomologationFilter.vue";
const filters = ref<Filters>({});
const setFilter = vi.fn();
vi.mock("@/composables/use-application-search", () => ({ useApplicationSearch: () => ({ filters, setFilter }) }));
afterEach(cleanup);
beforeEach(() => {
  filters.value = {};
  setFilter.mockReset();
});
it("applies an inclusive interval and resets pagination", async () => {
  render(HomologationFilter);
  await fireEvent.update(screen.getByLabelText("Date de fin à partir du"), "2026-11-09");
  await fireEvent.update(screen.getByLabelText("Date de fin jusqu’au (inclus)"), "2026-11-10");
  await fireEvent.click(screen.getByRole("button", { name: "Appliquer les dates" }));
  expect(setFilter).toHaveBeenCalledWith({
    homologationDateFrom: "2026-11-09",
    homologationDateTo: "2026-11-10",
    homologationDateMode: "range",
    page: 0,
  });
});
it("rejects reversed dates without changing the selection", async () => {
  render(HomologationFilter);
  await fireEvent.update(screen.getByLabelText("Date de fin à partir du"), "2026-11-10");
  await fireEvent.update(screen.getByLabelText("Date de fin jusqu’au (inclus)"), "2026-11-09");
  await fireEvent.click(screen.getByRole("button", { name: "Appliquer les dates" }));
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(setFilter).not.toHaveBeenCalled();
});
it("expired enforces completed status", async () => {
  render(HomologationFilter);
  await fireEvent.update(screen.getByLabelText("Filtre temporel"), "expired");
  expect(setFilter).toHaveBeenCalledWith({ homologationDateMode: "expired", homologationStatus: "homologuee", page: 0 });
});
