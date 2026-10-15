import { nextTick } from "vue";
import { useColumnPreferences } from "./use-column-preferences";
import { DEFAULT_VISIBLE_COLUMNS } from "@/types/columns";

vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ authenticated: true, hasPermissions: () => true }) }));

describe("préférences de largeur des colonnes", () => {
  beforeEach(async () => {
    useColumnPreferences().resetToDefaults();
    await nextTick();
    localStorage.clear();
  });

  it("partage et enregistre le réglage en conservant la visibilité choisie", async () => {
    const preferences = useColumnPreferences();
    preferences.setVisibleColumns(["label", "status"]);
    preferences.setColumnWidth("label", "425px");
    await nextTick();
    expect(useColumnPreferences().tableColumns.value).toEqual([
      { field: "label", header: "Nom", sortable: true, width: "425px" },
      { field: "status", header: "Statut", sortable: true, width: "150px" },
    ]);
    expect(JSON.parse(localStorage.getItem("app-table-column-preferences") ?? "{}")).toEqual({
      visibleColumns: ["label", "status"],
      columnWidths: { label: "425px" },
    });
  });

  it("rejette les colonnes inconnues et les valeurs CSS non numériques", () => {
    const preferences = useColumnPreferences();
    preferences.setColumnWidth("label", "auto;display:none");
    preferences.setColumnWidth("inconnue", "300px");
    expect(preferences.getColumnWidth("label")).toBe(300);
    expect(preferences.getColumnWidth("inconnue")).toBe(200);
  });

  it("réinitialise les largeurs et les colonnes affichées", () => {
    const preferences = useColumnPreferences();
    preferences.setVisibleColumns(["label"]);
    preferences.setColumnWidth("label", "500px");
    preferences.resetToDefaults();
    expect(preferences.visibleColumnFields.value).toEqual(DEFAULT_VISIBLE_COLUMNS);
    expect(preferences.getColumnWidth("label")).toBe(300);
  });
});
