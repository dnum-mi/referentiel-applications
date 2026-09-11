import {
  consumeLogoutReauthPending,
  consumeReauthAttempt,
  consumeStepDownNotice,
  isStepDownResponse,
  markLogoutReauthPending,
  markReauthAttempt,
  markStepDownNotice,
  profileAuthLevelText,
  reauthLoopState,
  setReauthLoop,
  weakAuthBannerText,
} from "./use-auth-level";

describe("use-auth-level (#1985)", () => {
  afterEach(() => {
    sessionStorage.clear();
    setReauthLoop(null);
  });

  describe("isStepDownResponse", () => {
    it("reconnaît les trois motifs du backend", () => {
      for (const reason of ["impersonation", "personal-token", "admin-action"]) {
        expect(isStepDownResponse({ statusCode: 403, stepDown: true, reason, message: "…" })).toBe(true);
      }
    });

    it("rejette les autres 403 et payloads voisins", () => {
      expect(isStepDownResponse({ statusCode: 403, blocked: true })).toBe(false);
      expect(isStepDownResponse({ maintenance: true })).toBe(false);
      expect(isStepDownResponse({ stepDown: true })).toBe(false);
      expect(isStepDownResponse({ stepDown: true, reason: "autre" })).toBe(false);
      expect(isStepDownResponse({ stepDown: "true", reason: "impersonation" })).toBe(false);
      expect(isStepDownResponse(null)).toBe(false);
      expect(isStepDownResponse("stepDown")).toBe(false);
    });
  });

  describe("drapeaux de reconnexion forte", () => {
    it("porte la stratégie et n'est consommé qu'une fois", () => {
      expect(consumeReauthAttempt()).toBeUndefined();
      markReauthAttempt("logout");
      expect(consumeReauthAttempt()).toBe("logout");
      expect(consumeReauthAttempt()).toBeUndefined();
    });

    it("lit comme `prompt` le drapeau posé par une version précédente", () => {
      sessionStorage.setItem("strongReauthAttempt", "1");
      expect(consumeReauthAttempt()).toBe("prompt");
    });

    it("expose en lecture seule la stratégie restée sans effet", () => {
      expect(reauthLoopState.value).toBeNull();
      setReauthLoop("prompt");
      expect(reauthLoopState.value).toBe("prompt");
    });

    it("relance la connexion après déconnexion pendant dix minutes seulement", () => {
      expect(consumeLogoutReauthPending()).toBe(false);
      markLogoutReauthPending(1_000);
      expect(consumeLogoutReauthPending(1_000 + 60_000)).toBe(true);
      expect(consumeLogoutReauthPending(1_000 + 60_000)).toBe(false);
      markLogoutReauthPending(1_000);
      expect(consumeLogoutReauthPending(1_000 + 10 * 60_000 + 1)).toBe(false);
    });
  });

  describe("bascule retenue", () => {
    it("survit à un rechargement de l'onglet et s'efface avec setReauthLoop(null)", async () => {
      setReauthLoop("prompt");
      expect(sessionStorage.getItem("strongReauthLoop")).toBe("prompt");

      vi.resetModules();
      const reloaded = await import("./use-auth-level");
      expect(reloaded.reauthLoopState.value).toBe("prompt");

      reloaded.setReauthLoop(null);
      expect(sessionStorage.getItem("strongReauthLoop")).toBeNull();
    });

    it("ignore une valeur inconnue au rechargement", async () => {
      sessionStorage.setItem("strongReauthLoop", "autre");
      vi.resetModules();
      const reloaded = await import("./use-auth-level");
      expect(reloaded.reauthLoopState.value).toBeNull();
    });
  });

  describe("weakAuthBannerText", () => {
    it("propose la reconnexion pour un mode faible", () => {
      const text = weakAuthBannerText("weak-method");
      expect(text.title).toContain("sans carte agent ni double authentification");
      expect(text.description).toContain("utilisateur standard");
      expect(text.canReauth).toBe(true);
    });

    it("explique un claim absent sans promettre une reconnexion utile", () => {
      const text = weakAuthBannerText("claim-missing");
      expect(text.title).toContain("non transmis");
      expect(text.description).toContain("contactez le support");
      expect(text.canReauth).toBe(true);
    });

    // Un fournisseur externe ne transmet jamais le mode : la reconnexion ne changerait rien.
    it("ne propose pas de reconnexion pour un fournisseur non listé", () => {
      const text = weakAuthBannerText("untrusted-idp");
      expect(text.title).toContain("fournisseur d'identité externe");
      expect(text.canReauth).toBe(false);
    });

    it("propose la déconnexion complète après une reconnexion `prompt` restée faible", () => {
      const text = weakAuthBannerText("weak-method", "prompt");
      expect(text.title).toContain("n'a pas été reconnue comme forte");
      expect(text.description).toContain("ferme complètement votre session");
      expect(text.canReauth).toBe(true);
    });

    it("oriente vers le support quand même la déconnexion complète laisse la session faible", () => {
      const text = weakAuthBannerText("claim-missing", "logout");
      expect(text.title).toContain("toujours sans authentification forte");
      expect(text.description).toContain("contactez le support");
      expect(text.canReauth).toBe(true);
    });
  });

  describe("avis stepDown après rechargement", () => {
    it("est consommé une seule fois et ignore une valeur inconnue", () => {
      expect(consumeStepDownNotice()).toBeUndefined();
      markStepDownNotice("impersonation");
      expect(consumeStepDownNotice()).toBe("impersonation");
      expect(consumeStepDownNotice()).toBeUndefined();
      sessionStorage.setItem("stepDownNotice", "autre");
      expect(consumeStepDownNotice()).toBeUndefined();
    });
  });

  describe("profileAuthLevelText", () => {
    it("est vide sans niveau (mode off, jeton API)", () => {
      expect(profileAuthLevelText(undefined)).toBeUndefined();
    });

    it("suit la même table de motifs que le bandeau pour une session rétrogradée", () => {
      expect(profileAuthLevelText({ level: "weak", downgraded: true, reason: "weak-method" })).toContain("sans carte agent");
      expect(profileAuthLevelText({ level: "unknown", downgraded: true, reason: "claim-missing" })).toContain("non transmis");
      expect(profileAuthLevelText({ level: "unknown", downgraded: true, reason: "untrusted-idp" })).toContain("externe");
    });

    it("décrit une session forte", () => {
      expect(profileAuthLevelText({ level: "strong", downgraded: false, reason: "strong-method" })).toBe(
        "Forte (carte agent ou double authentification)",
      );
    });

    // Mode observation : le testeur confronte ce qu'il a fait à ce que le référentiel a reçu.
    it("décrit le mode observation sans effet sur les droits", () => {
      expect(profileAuthLevelText({ level: "weak", downgraded: false, reason: "weak-method" })).toBe(
        "Mode observation, sans effet sur vos droits (niveau évalué : faible)",
      );
      expect(profileAuthLevelText({ level: "unknown", downgraded: false, reason: "claim-missing" })).toContain(
        "non transmis par le fournisseur",
      );
    });
  });
});
