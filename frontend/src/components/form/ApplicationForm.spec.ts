import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/vue";
import { ref } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import type { ApplicationFormInitialData } from "@/models/Application";
import ApplicationForm from "./ApplicationForm.vue";

const mocks = vi.hoisted(() => ({ save: vi.fn(), syncContact: vi.fn(), fetchActorTypes: vi.fn() }));
const submission = { isSubmitting: ref(false), saveError: ref("") };
vi.mock("@/stores/actorTypeStore", () => ({
  useActorTypeStore: () => ({
    actorTypes: [
      { id: "moa", code: "MOA" },
      { id: "moe", code: "MOE" },
    ],
    fetchAll: mocks.fetchActorTypes,
  }),
}));
vi.mock("@/stores/userStore", () => ({
  useUserStore: () => ({
    hasPermissions: (required: string[], granted: string[]) => required.some((permission) => granted.includes(permission)),
  }),
}));
vi.mock("@/stores/organizationStore", () => ({
  useOrganizationStore: () => ({ organizations: {}, find: vi.fn().mockResolvedValue([]), getById: vi.fn() }),
}));
vi.mock("./application/use-application-form-actions", () => ({
  useApplicationFormActions: () => ({
    save: mocks.save,
    syncContact: mocks.syncContact,
    isSubmitting: submission.isSubmitting,
    saveError: submission.saveError,
    moaSyncing: ref(false),
    moeSyncing: ref(false),
    initialMoaOrganization: ref(null),
    initialMoeOrganization: ref(null),
  }),
}));

function renderForm(
  mode: "create" | "edit" = "create",
  initialData: ApplicationFormInitialData = {},
  container?: HTMLElement,
  router?: Router,
) {
  return render(ApplicationForm, {
    container,
    props: { mode, initialData },
    global: {
      plugins: router ? [router] : [],
      directives: { "use-mermaid": {} },
      stubs: {
        BusinessDivisionSearch: true,
        TagSearchSelect: true,
        // Le piège de focus DSFR a besoin du layout d'un vrai navigateur (couvert par les E2E).
        DsfrModal: { props: ["opened"], template: '<div v-if="opened" role="dialog"><slot /></div>' },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockReset();
  submission.isSubmitting.value = false;
  submission.saveError.value = "";
});
afterEach(() => cleanup());

async function next() {
  await fireEvent.click(screen.getByTestId("application-next-btn"));
}

async function fillMainStep() {
  await fireEvent.update(screen.getByTestId("application-label"), "Application de test");
  await fireEvent.update(screen.getByTestId("markdown-textarea"), "Description de test");
}

function expectLinkedError(input: HTMLElement, message: string) {
  expect(input).toHaveAttribute("aria-invalid", "true");
  const errorId = input.getAttribute("aria-describedby");
  expect(errorId).toBeTruthy();
  expect(document.getElementById(errorId!)).toHaveTextContent(message);
}

describe("applicationForm — validation et navigation accessibles", () => {
  it("annonce les erreurs de la première étape et place le focus sur le premier champ invalide", async () => {
    renderForm();
    await next();
    const label = screen.getByTestId("application-label");
    expect(label).toHaveFocus();
    expectLinkedError(label, "Le nom de l'application est obligatoire.");
    expectLinkedError(screen.getByTestId("markdown-textarea"), "La description est obligatoire.");
    expect(mocks.save).not.toHaveBeenCalled();

    await fireEvent.update(label, "Application de test");
    await fireEvent.click(screen.getByTestId("markdown-tab-preview"));
    await next();
    await waitFor(() => expect(screen.getByTestId("markdown-textarea")).toHaveFocus());
    expect(label).not.toHaveAttribute("aria-invalid");
  });

  it("conserve les données entre étapes et déplace le focus vers chaque nouveau titre", async () => {
    renderForm();
    await fillMainStep();
    await next();
    expect(screen.getByTestId("application-step-title-2")).toHaveFocus();
    await next();
    expect(screen.getByTestId("application-step-title-3")).toHaveFocus();
    await next();
    const email = screen.getByTestId("application-moa-email");
    expect(email).toHaveFocus();
    expectLinkedError(email, "L'email du contact MOA est obligatoire.");
    await fireEvent.click(screen.getByTestId("application-previous-btn"));
    await fireEvent.click(screen.getByTestId("application-previous-btn"));
    expect(screen.getByTestId("application-label")).toHaveValue("Application de test");
    expect(screen.getByTestId("markdown-textarea")).toHaveValue("Description de test");
  });

  it("rejoint l'étape d'un champ invalide lors d'une soumission globale", async () => {
    renderForm();
    await fillMainStep();
    await next();
    await fireEvent.submit(screen.getByTestId("application-form"));
    expect(screen.getByTestId("application-step-title-3")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("application-moa-email")).toHaveFocus());
    expect(mocks.save).not.toHaveBeenCalled();
  });
});

describe("applicationForm — édition et annulation", () => {
  it("garde l'erreur dans le dialogue, bloque un second envoi et restitue le focus perdu", async () => {
    const dialog = document.createElement("dialog");
    dialog.open = true;
    const close = document.createElement("button");
    close.className = "fr-btn--close";
    close.textContent = "Fermer";
    const content = document.createElement("div");
    dialog.append(close, content);
    document.body.append(dialog);
    let release!: () => void;
    mocks.save.mockImplementation(() => {
      submission.isSubmitting.value = true;
      return new Promise<undefined>((resolve) => {
        release = () => {
          submission.saveError.value = "Modification refusée";
          submission.isSubmitting.value = false;
          resolve(undefined);
        };
      });
    });
    const view = renderForm(
      "edit",
      { id: "app", label: "Application", description: "Description", myPerms: new Set(["AppWrite"]) },
      content,
    );
    const alert = screen.getByTestId("application-save-error");
    expect(alert).toHaveAttribute("role", "alert");
    expect(alert).toBeEmptyDOMElement();
    const submit = screen.getByTestId("application-submit-btn");
    submit.focus();
    await fireEvent.submit(screen.getByTestId("application-form"));
    expect(submit).toBeDisabled();
    // jsdom keeps focus on a disabled button and ignores its blur(). Reproduce
    // the BODY focus that the browser witness observed before the correction.
    document.body.setAttribute("tabindex", "-1");
    document.body.focus();
    document.body.removeAttribute("tabindex");
    await waitFor(() => expect(close).toHaveFocus());
    await fireEvent.submit(screen.getByTestId("application-form"));
    expect(mocks.save).toHaveBeenCalledOnce();
    release();
    await waitFor(() => expect(submit).toHaveFocus());
    expect(screen.getByTestId("application-save-error")).toBe(alert);
    expect(alert).toHaveTextContent("Modification refusée");
    expect(view.emitted().success).toBeUndefined();
    expect(screen.getByTestId("application-label")).toHaveValue("Application");
    dialog.remove();
  });

  it("respecte un déplacement volontaire vers un champ pendant l'enregistrement", async () => {
    let release!: () => void;
    mocks.save.mockImplementation(() => {
      submission.isSubmitting.value = true;
      return new Promise<undefined>((resolve) => {
        release = () => {
          submission.saveError.value = "Refus tardif";
          submission.isSubmitting.value = false;
          resolve(undefined);
        };
      });
    });
    renderForm("edit", { id: "app", label: "Application", description: "Description", myPerms: new Set(["AppWrite"]) });
    screen.getByTestId("application-submit-btn").focus();
    await fireEvent.submit(screen.getByTestId("application-form"));
    const field = screen.getByTestId("application-shortname");
    field.focus();
    await fireEvent.update(field, "Brouillon conservé");
    release();
    await waitFor(() => expect(screen.getByTestId("application-save-error")).toHaveTextContent("Refus tardif"));
    expect(field).toHaveFocus();
    expect(field).toHaveValue("Brouillon conservé");
  });

  it("respecte la permission dédiée à la priorité de redémarrage", async () => {
    renderForm("edit", { id: "app", label: "Application", description: "Description", myPerms: new Set(["AppWritePriority"]) });
    expect(screen.getByTestId("application-label")).toBeDisabled();
    expect(screen.getByTestId("markdown-textarea")).toBeDisabled();
    expect(screen.getByTestId("application-priority-restart")).toBeEnabled();
    expect(screen.queryByTestId("application-moa-email")).not.toBeInTheDocument();
    await fireEvent.submit(screen.getByTestId("application-form"));
    expect(mocks.save).toHaveBeenCalledOnce();
  });

  it("n'altère pas les listes initiales avant l'enregistrement", async () => {
    const initialData: ApplicationFormInitialData = {
      id: "app",
      label: "Application",
      description: "Description",
      purposes: ["Objectif initial"],
      targetPopulations: ["Population initiale"],
      myPerms: new Set(["AppWrite"]),
    };
    const { emitted } = renderForm("edit", initialData);
    await fireEvent.update(screen.getByTestId("application-purpose-0"), "Objectif modifié");
    await fireEvent.click(screen.getByTestId("application-population-remove-0"));
    await fireEvent.click(screen.getByTestId("application-cancel-btn"));
    expect(emitted().cancel).toBeUndefined();
    await fireEvent.click(screen.getByTestId("application-cancel-modal-confirm"));
    expect(emitted().cancel).toHaveLength(1);
    expect(initialData.purposes).toEqual(["Objectif initial"]);
    expect(initialData.targetPopulations).toEqual(["Population initiale"]);
  });

  it("annule immédiatement une création vide", async () => {
    const { emitted } = renderForm();
    await fireEvent.click(screen.getByTestId("application-cancel-btn"));
    expect(emitted().cancel).toHaveLength(1);
  });

  it("permet de reprendre une création et restaure le focus sur son bouton d'origine", async () => {
    const { emitted } = renderForm();
    await fillMainStep();
    const cancel = screen.getByTestId("application-cancel-btn");
    await fireEvent.click(cancel);
    const modal = screen.getByTestId("application-cancel-modal");
    expect(modal).toBeVisible();
    await fireEvent.click(within(modal).getByTestId("application-cancel-modal-close"));
    await waitFor(() => expect(cancel).toHaveFocus());
    expect(emitted().cancel).toBeUndefined();
    expect(screen.getByTestId("application-label")).toHaveValue("Application de test");
    await fireEvent.click(cancel);
    await fireEvent.click(screen.getByTestId("application-cancel-modal-confirm"));
    expect(emitted().cancel).toHaveLength(1);
  });
});

const editData: ApplicationFormInitialData = {
  id: "app",
  label: "Application",
  description: "Description",
  myPerms: new Set(["AppWrite"]),
};
function unloadPrevented() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

it.each(["create", "edit"] as const)("protège %s et retire la protection après restauration et démontage", async (mode) => {
  const scene = renderForm(mode, mode === "edit" ? editData : {});
  expect(unloadPrevented()).toBe(false);
  await fireEvent.update(screen.getByTestId("application-label"), "Modifiée");
  expect(unloadPrevented()).toBe(true);
  await fireEvent.update(screen.getByTestId("application-label"), mode === "edit" ? "Application" : "");
  expect(unloadPrevented()).toBe(false);
  await fireEvent.update(screen.getByTestId("application-label"), "Modifiée");
  scene.unmount();
  expect(unloadPrevented()).toBe(false);
});

it("conserve la protection après échec et la retire avant le succès", async () => {
  const scene = renderForm("edit", editData);
  await fireEvent.update(screen.getByTestId("application-label"), "Modifiée");
  await fireEvent.submit(screen.getByTestId("application-form"));
  expect(scene.emitted().success).toBeUndefined();
  expect(unloadPrevented()).toBe(true);
  expect(screen.getByTestId("application-label")).toHaveValue("Modifiée");
  mocks.save.mockResolvedValue({ id: "app" });
  await fireEvent.submit(screen.getByTestId("application-form"));
  await waitFor(() => expect(scene.emitted().success).toHaveLength(1));
  expect(unloadPrevented()).toBe(false);
});

async function routingScene() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/:id?", component: { template: "<div />" } },
      { path: "/other/page", component: { template: "<div />" } },
    ],
  });
  await router.push("/app");
  await router.isReady();
  const scene = renderForm("edit", editData, undefined, router);
  await fireEvent.update(screen.getByTestId("application-label"), "Modifiée");
  return { router, scene };
}

it.each(["/other/page", "/another-app"])("confirme la navigation vers %s une seule fois", async (destination) => {
  const { router, scene } = await routingScene();
  const first = router.push(destination);
  await screen.findByTestId("application-cancel-modal");
  await fireEvent.click(screen.getByTestId("application-cancel-btn"));
  expect(screen.getAllByTestId("application-cancel-modal")).toHaveLength(1);
  await fireEvent.click(screen.getByTestId("application-cancel-modal-close"));
  await first;
  expect(router.currentRoute.value.path).toBe("/app");
  expect(screen.getByTestId("application-label")).toHaveValue("Modifiée");
  const second = router.push(destination);
  await screen.findByTestId("application-cancel-modal");
  await fireEvent.click(screen.getByTestId("application-cancel-modal-confirm"));
  await second;
  expect(router.currentRoute.value.path).toBe(destination);
  scene.unmount();
  await router.push("/app");
});

it("bloque les sorties pendant la sauvegarde", async () => {
  const { router, scene } = await routingScene();
  submission.isSubmitting.value = true;
  await router.push("/other/page");
  expect(router.currentRoute.value.path).toBe("/app");
  expect(screen.getByTestId("application-cancel-btn")).toBeDisabled();
  expect(screen.queryByTestId("application-cancel-modal")).not.toBeInTheDocument();
  expect(scene.emitted().cancel).toBeUndefined();
  expect(unloadPrevented()).toBe(true);
});

it("ne redemande pas confirmation quand Annuler provoque une navigation", async () => {
  const { router, scene } = await routingScene();
  await fireEvent.click(screen.getByTestId("application-cancel-btn"));
  await fireEvent.click(screen.getByTestId("application-cancel-modal-confirm"));
  expect(scene.emitted().cancel).toHaveLength(1);
  await router.push("/other/page");
  expect(router.currentRoute.value.path).toBe("/other/page");
  expect(screen.queryByTestId("application-cancel-modal")).not.toBeInTheDocument();
});
