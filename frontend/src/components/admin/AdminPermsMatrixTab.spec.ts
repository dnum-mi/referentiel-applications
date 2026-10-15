import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import type { AppPermsDto } from "@/client/types.gen";
import AppPermsMatrix from "./AppPermsMatrix.vue";
import AdminPermsMatrixTab from "./AdminPermsMatrixTab.vue";

const { getMatrix, updateMatrix } = vi.hoisted(() => ({ getMatrix: vi.fn(), updateMatrix: vi.fn() }));
vi.mock("@/api/index", () => ({ default: { actorTypeControllerGetMatrix: getMatrix, actorTypeControllerUpdateMatrix: updateMatrix } }));
vi.mock("@/stores/actorTypeStore", () => ({
  useActorTypeStore: () => ({ actorTypes: [{ id: "moa", label: "Maîtrise d’ouvrage" }], fetchAll: vi.fn() }),
}));
vi.mock("@/stores/toasterStore", () => ({ useToasterStore: () => ({ addSuccessMessage: vi.fn(), addErrorMessage: vi.fn() }) }));

const permissions: AppPermsDto = {
  actorTypeId: "moa",
  AppRead: true,
  AppWrite: false,
  AppWritePriority: false,
  ActorRead: true,
  ActorWrite: false,
  ComplianceRead: true,
  ComplianceWrite: false,
  HostingRead: true,
  HostingWrite: false,
  MetadataRead: true,
  DataRead: true,
  DataWrite: false,
  TechnologyRead: true,
  TechnologyWrite: false,
  RelationRead: true,
  RelationWrite: false,
  LinkRead: true,
  LinkWrite: false,
  ReportRead: true,
  ReportPost: false,
  ReportManage: false,
};

type MatrixReply = { response: { ok: boolean }; data?: AppPermsDto[]; error?: { message: string } };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
const success = (data = [{ ...permissions }]): MatrixReply => ({ response: { ok: true }, data });
const failure: MatrixReply = { response: { ok: false }, error: { message: "HTTP 500" } };

enableAutoUnmount(afterEach);
beforeEach(() => {
  getMatrix.mockReset().mockResolvedValue(success());
  updateMatrix.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});
async function mountTab() {
  const wrapper = mount(AdminPermsMatrixTab, { attachTo: document.body, global: { stubs: { AppPermsMatrixHistory: true } } });
  await flushPromises();
  return wrapper;
}

it("garde le tableau, le brouillon et le focus après 500, puis permet une seule relance et sa relecture", async () => {
  const pending = deferred<MatrixReply>();
  updateMatrix.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(success());
  const wrapper = await mountTab();
  const matrix = wrapper.get('[data-testid="app-perms-table"]').element;
  const link = wrapper.get('[data-testid="app-perms-select-moa-Link"]');
  const save = wrapper.get<HTMLButtonElement>('[data-testid="app-perms-save-btn"]');
  await link.trigger("click");
  save.element.focus();
  await save.trigger("click");
  expect(save.attributes("aria-disabled")).toBe("true");
  expect(save.element.disabled).toBe(false);
  expect(document.activeElement).toBe(save.element);
  expect(wrapper.get('[data-testid="app-perms-table"]').element).toBe(matrix);
  expect(link.attributes("data-state")).toBe("Write");
  expect(wrapper.get('[data-testid="app-perms-matrix-status"]').text()).toContain("Enregistrement");
  expect(wrapper.get('[data-testid="app-perms-matrix-status"]').element.closest('[aria-busy="true"]')).toBeNull();
  await save.trigger("click");
  await wrapper.get('[data-testid="app-perms-reload-btn"]').trigger("click");
  expect(updateMatrix).toHaveBeenCalledOnce();
  expect(getMatrix).toHaveBeenCalledOnce();

  pending.resolve(failure);
  await flushPromises();
  expect(wrapper.get('[data-testid="app-perms-matrix-error"]').text()).toContain("Votre saisie est conservée");
  expect(wrapper.get('[data-testid="app-perms-matrix-error"]').attributes("role")).toBe("alert");
  expect(document.activeElement).toBe(save.element);
  expect(link.attributes("data-state")).toBe("Write");
  expect(wrapper.get('[data-testid="app-perms-table"]').element).toBe(matrix);
  expect(getMatrix).toHaveBeenCalledOnce();

  getMatrix.mockResolvedValueOnce(
    success([
      { ...permissions, LinkWrite: true },
      { ...permissions, actorTypeId: "new-actor" },
    ]),
  );
  await save.trigger("click");
  await flushPromises();
  expect(updateMatrix).toHaveBeenCalledTimes(2);
  expect(updateMatrix).toHaveBeenLastCalledWith({ body: [{ ...permissions, LinkWrite: true }] });
  expect(getMatrix).toHaveBeenCalledTimes(2);
  expect(link.attributes("data-state")).toBe("Write");
  expect(wrapper.find('[data-testid="app-perms-row-new-actor"]').exists()).toBe(true);
  expect(wrapper.get('[data-testid="app-perms-matrix-status"]').text()).toBe("Matrice des permissions mise à jour avec succès");
  expect(wrapper.get('[data-testid="app-perms-matrix-error"]').text()).toBe("");
  expect(document.activeElement).toBe(save.element);
  expect(permissions.LinkWrite).toBe(false);
});

it("traite une exception sans perdre la saisie et respecte un déplacement volontaire du focus", async () => {
  const pending = deferred<MatrixReply>();
  updateMatrix.mockReturnValueOnce(pending.promise);
  const wrapper = await mountTab();
  const link = wrapper.get('[data-testid="app-perms-select-moa-Link"]');
  const save = wrapper.get<HTMLButtonElement>('[data-testid="app-perms-save-btn"]');
  await link.trigger("click");
  save.element.focus();
  await save.trigger("click");
  const otherControl = document.createElement("button");
  otherControl.textContent = "Autre action";
  document.body.append(otherControl);
  otherControl.focus();
  pending.reject(new Error("Connexion interrompue"));
  await flushPromises();
  expect(wrapper.get('[data-testid="app-perms-matrix-error"]').text()).toContain("Votre saisie est conservée");
  expect(link.attributes("data-state")).toBe("Write");
  expect(document.activeElement).toBe(otherControl);
  expect(save.attributes("aria-disabled")).toBe("false");
  expect(getMatrix).toHaveBeenCalledOnce();
});

it("fusionne la relecture réussie avec la saisie postérieure à la soumission sans reprendre le focus", async () => {
  const pending = deferred<MatrixReply>();
  const reload = deferred<MatrixReply>();
  updateMatrix.mockReturnValueOnce(pending.promise);
  getMatrix.mockResolvedValueOnce(success()).mockReturnValueOnce(reload.promise);
  const wrapper = await mountTab();
  const link = wrapper.get<HTMLButtonElement>('[data-testid="app-perms-select-moa-Link"]');
  const save = wrapper.get<HTMLButtonElement>('[data-testid="app-perms-save-btn"]');
  await link.trigger("click");
  save.element.focus();
  await save.trigger("click");
  link.element.focus();
  await link.trigger("click");
  expect(updateMatrix).toHaveBeenCalledWith({ body: [{ ...permissions, LinkWrite: true }] });
  expect(link.attributes("data-state")).toBe("none");
  pending.resolve(success());
  await flushPromises();
  expect(wrapper.findComponent(AppPermsMatrix).exists()).toBe(true);
  expect(link.attributes("data-state")).toBe("none");
  expect(save.attributes("aria-disabled")).toBe("true");
  reload.resolve(success([{ ...permissions, LinkWrite: true, DataWrite: true }]));
  await flushPromises();
  expect(link.attributes("data-state")).toBe("none");
  expect(wrapper.get('[data-testid="app-perms-select-moa-Data"]').attributes("data-state")).toBe("Write");
  expect(document.activeElement).toBe(link.element);
  expect(updateMatrix.mock.calls[0][0].body[0].LinkWrite).toBe(true);
  expect(updateMatrix.mock.calls[0][0].body[0].LinkRead).toBe(true);
});

it("distingue l’enregistrement réussi de sa relecture refusée et propose un réessai sans renvoyer PATCH", async () => {
  updateMatrix.mockResolvedValueOnce(success());
  getMatrix
    .mockResolvedValueOnce(success())
    .mockResolvedValueOnce(failure)
    .mockResolvedValueOnce(success([{ ...permissions, LinkWrite: true }]));
  const wrapper = await mountTab();
  await wrapper.get('[data-testid="app-perms-select-moa-Link"]').trigger("click");
  await wrapper.get('[data-testid="app-perms-save-btn"]').trigger("click");
  await flushPromises();
  expect(wrapper.get('[data-testid="app-perms-matrix-status"]').text()).toContain("enregistrée. La relecture n'a pas abouti");
  expect(wrapper.get('[data-testid="app-perms-matrix-error"]').text()).toContain("Erreur lors du chargement");
  expect(wrapper.get('[data-testid="app-perms-select-moa-Link"]').attributes("data-state")).toBe("Write");
  await wrapper.get('[data-testid="app-perms-matrix-error"] button').trigger("click");
  await flushPromises();
  expect(getMatrix).toHaveBeenCalledTimes(3);
  expect(updateMatrix).toHaveBeenCalledOnce();
  expect(wrapper.get('[data-testid="app-perms-matrix-error"]').text()).toBe("");
  expect(wrapper.get('[data-testid="app-perms-select-moa-Link"]').attributes("data-state")).toBe("Write");
});
