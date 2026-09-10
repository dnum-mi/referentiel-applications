import {
  consumeReauthAttempt,
  consumeStepDownNotice,
  isStepDownResponse,
  markReauthAttempt,
  markStepDownNotice,
  profileAuthLevelText,
  reauthLoopState,
  setReauthLoopDetected,
  weakAuthBannerText,
} from "./use-auth-level";

describe("use-auth-level (#1985)", () => {
  afterEach(() => {
    sessionStorage.clear();
    setReauthLoopDetected(false);
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

  describe("drapeau de reconnexion forte", () => {
    it("est consommé une seule fois", () => {
      expect(consumeReauthAttempt()).toBe(false);
      markReauthAttempt();
      expect(consumeReauthAttempt()).toBe(true);
      expect(consumeReauthAttempt()).toBe(false);
    });

    it("expose l'état de boucle en lecture seule", () => {
      expect(reauthLoopState.value).toBe(false);
      setReauthLoopDetected(true);
      expect(reauthLoopState.value).toBe(true);
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

    it("prend le pas avec la variante « boucle » quelle que soit la raison", () => {
      const text = weakAuthBannerText("weak-method", true);
      expect(text.title).toContain("n'a pas été reconnue comme forte");
      expect(text.description).toContain("activez la double authentification");
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
