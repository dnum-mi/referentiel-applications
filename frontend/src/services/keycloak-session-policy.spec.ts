import realm from "../../../keycloak/realm-export.json";

const day = 24 * 60 * 60;

describe("Politique des sessions Keycloak — RGAA 13.1.4", () => {
  it("propose avant connexion un choix qui annonce explicitement la durée prolongée", () => {
    expect(realm.rememberMe).toBe(true);
    expect(realm.localizationTexts.en.rememberMe).toMatch(/24 hours/);
    expect(realm.localizationTexts.fr.rememberMe).toMatch(/24 heures/);
  });

  it("place le maximum des sessions ordinaires au-delà de vingt heures", () => {
    expect(realm.ssoSessionMaxLifespan).toBe(day);
    expect(realm.ssoSessionMaxLifespan).toBeGreaterThan(20 * 60 * 60);
  });

  it("conserve trente minutes d'inactivité pour une connexion ordinaire", () => {
    expect(realm.ssoSessionIdleTimeout).toBe(30 * 60);
  });

  it("permet de multiplier la limite d'inactivité par au moins dix avec Remember Me", () => {
    expect(realm.ssoSessionIdleTimeoutRememberMe).toBe(day);
    expect(realm.ssoSessionIdleTimeoutRememberMe).toBeGreaterThanOrEqual(10 * realm.ssoSessionIdleTimeout);
    expect(realm.ssoSessionMaxLifespanRememberMe).toBe(day);
  });

  it("laisse les sessions client hériter de la branche choisie au lieu de la raccourcir", () => {
    expect(realm.clientSessionIdleTimeout).toBe(0);
    expect(realm.clientSessionMaxLifespan).toBe(0);
    for (const client of realm.clients) {
      expect(client).not.toHaveProperty(["attributes", "client.session.idle.timeout"]);
      expect(client).not.toHaveProperty(["attributes", "client.session.max.lifespan"]);
    }
  });

  it("conserve des jetons d'accès de cinq minutes", () => {
    expect(realm.accessTokenLifespan).toBe(300);
  });

  it("ne demande pas d'accès hors ligne pour prolonger la connexion", () => {
    for (const client of realm.clients) {
      expect(client.defaultClientScopes).not.toContain("offline_access");
    }
  });
});
