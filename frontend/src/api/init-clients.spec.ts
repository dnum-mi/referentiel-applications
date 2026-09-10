const { interceptors, assignMock } = vi.hoisted(() => ({
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  assignMock: vi.fn(),
}));

vi.mock("@/client/client.gen", () => ({
  client: { interceptors, setConfig: vi.fn() },
}));
vi.mock("@/services/authentication", () => ({
  USER_MANAGER: { getUser: vi.fn().mockResolvedValue(null), signinSilent: vi.fn(), signinRedirect: vi.fn() },
}));

import { configureClients } from "./init-clients";

type ResponseInterceptor = (response: Response) => Promise<Response>;

function forbidden(payload: unknown): Response {
  return {
    ok: false,
    status: 403,
    clone: () => ({ json: () => Promise.resolve(payload) }),
  } as unknown as Response;
}

describe("init-clients — 403 liés au niveau d'authentification (#1985)", () => {
  const toaster = { addErrorMessage: vi.fn() };
  let interceptor: ResponseInterceptor;
  let downgraded = false;

  beforeEach(() => {
    interceptors.response.use.mockReset();
    toaster.addErrorMessage.mockReset();
    assignMock.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    downgraded = false;
    vi.stubGlobal("location", { ...globalThis.location, assign: assignMock, pathname: "/", search: "" });
    configureClients(toaster, { isAuthDowngraded: () => downgraded });
    interceptor = interceptors.response.use.mock.calls[0][0] as ResponseInterceptor;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("purge l'impersonation et recharge une fois sur un refus d'impersonation", async () => {
    localStorage.setItem("impersonatedUserId", "target");
    await interceptor(forbidden({ statusCode: 403, stepDown: true, reason: "impersonation", message: "…" }));
    expect(localStorage.getItem("impersonatedUserId")).toBeNull();
    expect(assignMock).toHaveBeenCalledWith("/");
    // Expliqué après le rechargement, pas par un toast immédiatement perdu.
    expect(sessionStorage.getItem("stepDownNotice")).toBe("impersonation");
    expect(toaster.addErrorMessage).not.toHaveBeenCalled();
  });

  it("affiche le message dédié pour un jeton personnel refusé", async () => {
    await interceptor(forbidden({ statusCode: 403, stepDown: true, reason: "personal-token" }));
    expect(toaster.addErrorMessage).toHaveBeenCalledWith(expect.stringContaining("jeton personnel"));
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("enrichit le refus générique quand la session est rétrogradée", async () => {
    downgraded = true;
    await interceptor(forbidden({ statusCode: 403, message: "Forbidden" }));
    expect(toaster.addErrorMessage).toHaveBeenCalledWith(expect.stringContaining("sans authentification forte"));
  });

  it("conserve le refus générique pour une session forte", async () => {
    await interceptor(forbidden({ statusCode: 403, message: "Forbidden" }));
    expect(toaster.addErrorMessage).toHaveBeenCalledWith("Permission refusée : Vous n'avez pas la permission d'effectuer cette action.");
  });
});
