import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/vue";
import { computed, ref } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { ApplicationWithPerms } from "@/models/Application";
import CompliancesAccordionManager from "./CompliancesAccordionManager.vue";

const mocks = vi.hoisted(() => ({ find: vi.fn(), scan: vi.fn(), error: vi.fn(), success: vi.fn(), mobile: false, allowed: true }));
vi.mock("@/api/index.js", () => ({ default: { applicationCompliancesControllerFindOne: mocks.find } }));
vi.mock("@/client/sdk.gen", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/client/sdk.gen")>()),
  applicationCompliancesControllerScanEcoIndex: mocks.scan,
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addErrorMessage: mocks.error, addSuccessMessage: mocks.success }) }));
vi.mock("@/composables/use-app-permission", () => ({ useAppPermission: () => computed(() => mocks.allowed) }));
vi.mock("@vueuse/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vueuse/core")>()),
  useMediaQuery: () => ref(mocks.mobile),
}));

const application = { id: "app-at", label: "Application AT", description: "Description AT", myPerms: new Set() } as ApplicationWithPerms;
const compliance = { eco_index_score: 65, eco_index_target_url: "https://example.invalid" };
function renderManager() {
  return render(CompliancesAccordionManager, {
    props: { application },
    global: {
      stubs: {
        RgaaComplianceSection: true,
        DsfrModal: true,
        RefAppTable: {
          props: ["items"],
          template:
            '<div><div v-for="item in items" :key="item.type"><span>{{ item.preview }}</span><slot name="body-Actions" :data="item" /></div></div>',
        },
      },
    },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.mobile = false;
  mocks.allowed = true;
  mocks.find.mockResolvedValue({ response: { ok: true }, data: compliance });
  mocks.scan.mockReset();
});
afterEach(cleanup);

it.each([false, true])("garde la commande EcoIndex focalisée en attente et après un refus (mobile=%s)", async (mobile) => {
  mocks.mobile = mobile;
  let complete = () => {};
  mocks.scan.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = () => resolve({ response: { ok: false }, error: { message: "Scan refusé AT" } });
      }),
  );
  renderManager();
  await flushPromises();
  const button = await screen.findByTestId("compliance-scan-ecoindex-btn");
  button.focus();
  await fireEvent.click(button);
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(button).not.toBeDisabled();
  expect(button).toHaveFocus();
  await fireEvent.click(button);
  expect(mocks.scan).toHaveBeenCalledTimes(1);
  complete();
  await waitFor(() => expect(button).toHaveAttribute("aria-disabled", "false"));
  expect(button).toHaveFocus();
  expect(mocks.error).toHaveBeenCalledWith("Scan refusé AT");
  expect(mocks.success).not.toHaveBeenCalled();
});

it("ne reprend pas le focus déplacé pendant un calcul réussi", async () => {
  let complete = () => {};
  mocks.scan.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = () => resolve({ response: { ok: true }, data: { ...compliance, eco_index_score: 82 } });
      }),
  );
  renderManager();
  await flushPromises();
  const button = await screen.findByTestId("compliance-scan-ecoindex-btn");
  button.focus();
  await fireEvent.click(button);
  const outside = document.createElement("button");
  document.body.append(outside);
  outside.focus();
  complete();
  await waitFor(() => expect(mocks.success).toHaveBeenCalledWith("Scan EcoIndex effectué avec succès."));
  expect(outside).toHaveFocus();
  outside.remove();
});

it.each([false, true])("recharge la cible après un conflit sans relancer le scan (mobile=%s)", async (mobile) => {
  mocks.mobile = mobile;
  const message =
    "La cible EcoIndex a été modifiée ou supprimée pendant le calcul. Résultat ignoré. Vérifiez l’URL actuelle puis relancez le calcul.";
  mocks.scan.mockResolvedValue({ response: { ok: false, status: 409 }, error: { message } });
  renderManager();
  await flushPromises();
  mocks.find.mockResolvedValue({
    response: { ok: true },
    data: { ...compliance, eco_index_target_url: "https://current.example.test", eco_index_score: null },
  });
  const button = await screen.findByTestId("compliance-scan-ecoindex-btn");
  await fireEvent.click(button);
  await waitFor(() => expect(mocks.find).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByTestId("compliance-scan-ecoindex-btn")).toHaveAttribute("aria-disabled", "false"));
  expect(screen.getAllByText("Non calculé").length).toBeGreaterThan(0);
  expect(screen.queryByText(/65\/100/)).not.toBeInTheDocument();
  expect(mocks.error).toHaveBeenCalledWith(message);
  expect(mocks.scan).toHaveBeenCalledTimes(1);
  expect(mocks.success).not.toHaveBeenCalled();
});
