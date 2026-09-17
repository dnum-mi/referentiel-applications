const { interceptors, assignMock, setConfigMock } = vi.hoisted(() => ({
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  assignMock: vi.fn(),
  setConfigMock: vi.fn(),
}));

vi.mock("@/client/client.gen", () => ({
  client: { interceptors, setConfig: setConfigMock },
}));
vi.mock("@/services/authentication", () => ({
  USER_MANAGER: { getUser: vi.fn().mockResolvedValue(null), signinSilent: vi.fn(), signinRedirect: vi.fn() },
}));

import { configureClients } from "./init-clients";
import { fetchWithTimeout } from "./fetch-with-timeout";
import { USER_MANAGER } from "@/services/authentication";

type ResponseInterceptor = (response: Response, request?: Request) => Promise<Response>;

function forbidden(payload: unknown): Response {
  return {
    ok: false,
    status: 403,
    clone: () => ({ json: () => Promise.resolve(payload) }),
  } as unknown as Response;
}

describe("init-clients — 403 liés au niveau d'authentification (#1985)", () => {
  const toaster = { addErrorMessage: vi.fn() };
  const onStrongAuthRequired = vi.fn();
  let interceptor: ResponseInterceptor;
  let downgraded = false;

  beforeEach(() => {
    interceptors.response.use.mockReset();
    toaster.addErrorMessage.mockReset();
    assignMock.mockReset();
    localStorage.clear();
    sessionStorage.clear();
    downgraded = false;
    onStrongAuthRequired.mockReset();
    vi.mocked(USER_MANAGER.getUser).mockResolvedValue(null);
    vi.stubGlobal("location", { ...globalThis.location, assign: assignMock, pathname: "/", search: "" });
    configureClients(toaster, { isAuthDowngraded: () => downgraded, onStrongAuthRequired });
    interceptor = interceptors.response.use.mock.calls[0][0] as ResponseInterceptor;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("branche le timeout sur le transport du client généré", () => {
    expect(setConfigMock).toHaveBeenLastCalledWith(expect.objectContaining({ fetch: fetchWithTimeout, credentials: "include" }));
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

  it.each(["current", "expired"])("ne bloque que la session concernée par le refus (%s)", async (token) => {
    const authLevel = { level: "weak", downgraded: true, reason: "weak-method" };
    vi.mocked(USER_MANAGER.getUser).mockResolvedValue({ access_token: "current" } as Awaited<ReturnType<typeof USER_MANAGER.getUser>>);
    const request = { headers: new Headers({ Authorization: `Bearer ${token}` }) } as Request;
    await interceptor(forbidden({ strongAuthRequired: true, authLevel }), request);
    if (token === "current") expect(onStrongAuthRequired).toHaveBeenCalledWith(authLevel);
    else expect(onStrongAuthRequired).not.toHaveBeenCalled();
    expect(toaster.addErrorMessage).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    expect(USER_MANAGER.signinSilent).not.toHaveBeenCalled();
    expect(USER_MANAGER.signinRedirect).not.toHaveBeenCalled();
  });
});
