import PrimeVue from "primevue/config";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/vue";
import type { OrganizationDto } from "@/client/types.gen";
import type { ServerTableQuery } from "@/composables/use-server-paginated-table";
import AdminOrganizationsTab from "./AdminOrganizationsTab.vue";

const { findAll } = vi.hoisted(() => ({ findAll: vi.fn() }));
vi.mock("@/api", () => ({ default: { organizationsControllerFindAll: findAll } }));

const organizations = [
  { id: "org-1", path: "MI/Alpha", sigle: "ZZZ", url: null, parentId: null, businessDivisionId: null },
  { id: "org-2", path: "MI/Zulu", sigle: "AAA", url: null, parentId: null, businessDivisionId: null },
] satisfies OrganizationDto[];

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  findAll.mockReset().mockImplementation(async ({ query }: { query: ServerTableQuery & { search?: string } }) => {
    const key: "path" | "sigle" = query.sortBy === "sigle" ? "sigle" : "path";
    const results = [...organizations].sort((a, b) => (a[key] ?? "").localeCompare(b[key] ?? "") * (query.order === "desc" ? -1 : 1));
    return { data: { results, total: 30 } };
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("transmet le tri Chemin et Sigle au serveur et affiche les réponses dans cet ordre", async () => {
  render(AdminOrganizationsTab, {
    global: { plugins: [[PrimeVue, { unstyled: true }]], stubs: { OrganizationActions: true } },
  });
  const firstPath = () => within(screen.getAllByRole("row")[1]).getAllByRole("cell")[0];
  await waitFor(() => expect(firstPath()).toHaveTextContent("MI/Alpha"));
  expect(findAll).toHaveBeenLastCalledWith({ query: { page: 0, pageSize: 15, sortBy: "path", order: "asc", search: undefined } });

  await fireEvent.click(screen.getByRole("button", { name: "Chemin" }));
  await waitFor(() => expect(firstPath()).toHaveTextContent("MI/Zulu"));
  expect(findAll).toHaveBeenLastCalledWith({ query: { page: 0, pageSize: 15, sortBy: "path", order: "desc", search: undefined } });
  expect(screen.getByRole("columnheader", { name: "Chemin" })).toHaveAttribute("aria-sort", "descending");

  await fireEvent.click(screen.getByRole("button", { name: "Page suivante (page 2 sur 2)" }));
  await waitFor(() =>
    expect(findAll).toHaveBeenLastCalledWith({ query: { page: 1, pageSize: 15, sortBy: "path", order: "desc", search: undefined } }),
  );
  await fireEvent.click(screen.getByRole("button", { name: "Sigle" }));
  await waitFor(() =>
    expect(findAll).toHaveBeenLastCalledWith({ query: { page: 0, pageSize: 15, sortBy: "sigle", order: "asc", search: undefined } }),
  );
  expect(firstPath()).toHaveTextContent("MI/Zulu");
  expect(screen.getByRole("columnheader", { name: "Sigle" })).toHaveAttribute("aria-sort", "ascending");

  await fireEvent.click(screen.getByRole("button", { name: "Sigle" }));
  await waitFor(() => expect(firstPath()).toHaveTextContent("MI/Alpha"));
  expect(findAll).toHaveBeenLastCalledWith({ query: { page: 0, pageSize: 15, sortBy: "sigle", order: "desc", search: undefined } });
});
