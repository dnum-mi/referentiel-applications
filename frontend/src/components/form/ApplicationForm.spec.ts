import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/vue";
import { ref } from "vue";
import type { ApplicationFormInitialData } from "@/models/Application";
import ApplicationForm from "./ApplicationForm.vue";

const mocks = vi.hoisted(() => ({ save: vi.fn(), syncContact: vi.fn(), fetchActorTypes: vi.fn() }));
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
    isSubmitting: ref(false),
    moaSyncing: ref(false),
    moeSyncing: ref(false),
    initialMoaOrganization: ref(null),
    initialMoeOrganization: ref(null),
  }),
}));

function renderForm(mode: "create" | "edit" = "create", initialData: ApplicationFormInitialData = {}) {
  return render(ApplicationForm, {
    props: { mode, initialData },
    global: {
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

beforeEach(() => vi.clearAllMocks());
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
