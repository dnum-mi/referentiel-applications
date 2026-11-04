import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { ref } from "vue";
import { Permission } from "@/client/types.gen";
import ReportsTab from "./ReportsTab.vue";

afterEach(() => cleanup());

const { findAll, hasPermissions } = vi.hoisted(() => ({
  findAll: vi.fn(),
  hasPermissions: vi.fn(),
}));

vi.mock("@/api", () => ({ default: { reportsControllerFindAll: findAll } }));
vi.mock("@/stores/userStore", () => ({ useUserStore: () => ({ hasPermissions }) }));

const canManageReports = ref(false);

const report = {
  id: "report-1",
  description: "Adresse à corriger",
  notes: "",
  status: "in_pending",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T10:00:00.000Z",
  applicationId: null,
  application: null,
  notifierId: "notifier-1",
  notifier: { id: "notifier-1", email: "contact@example.test" },
};

const renderTab = () =>
  render(ReportsTab, {
    props: { isActive: true, allReport: true },
    global: {
      stubs: {
        DsfrButton: {
          props: ["label"],
          emits: ["click"],
          template: "<button @click=\"$emit('click')\">{{ label }}</button>",
        },
        DsfrSearchBar: true,
        RouterLink: true,
        RefAppTable: {
          props: ["items"],
          template:
            '<div data-testid="reports-table"><template v-for="item in items" :key="item.id"><slot name="body-notes" :data="item" /><slot name="body-status" :data="item" /></template></div>',
        },
        Notes: {
          props: ["isEditing"],
          template: '<span :data-testid="`notes-editing-${isEditing}`" />',
        },
        ReportStatusTag: {
          props: ["isEditing"],
          template: '<span :data-testid="`status-editing-${isEditing}`" />',
        },
      },
    },
  });

describe("ReportsTab — traitement des signalements", () => {
  beforeEach(() => {
    canManageReports.value = false;
    findAll.mockReset().mockResolvedValue({ data: { results: [report], total: 1 }, response: { ok: true } });
    hasPermissions.mockImplementation(
      (permissions: Permission[]) => canManageReports.value && permissions.includes(Permission.REPORT_MANAGE),
    );
  });

  it("permet à un contributeur doté de ReportManage de modifier les notes et le statut", async () => {
    canManageReports.value = true;
    renderTab();

    const edit = await screen.findByRole("button", { name: "Modifier" });
    expect(hasPermissions).toHaveBeenCalledWith([Permission.REPORT_MANAGE]);
    await fireEvent.click(edit);

    expect(screen.getByRole("button", { name: "Arrêter de modifier" })).toBeInTheDocument();
    expect(screen.getByTestId("notes-editing-true")).toBeInTheDocument();
    expect(screen.getByTestId("status-editing-true")).toBeInTheDocument();
  });

  it("ne propose pas l’édition à un lecteur sans ReportManage", async () => {
    renderTab();

    await waitFor(() => expect(screen.getByTestId("issues-table")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
    expect(screen.getByTestId("notes-editing-false")).toBeInTheDocument();
    expect(screen.getByTestId("status-editing-false")).toBeInTheDocument();
  });
});
