import { ApiClient } from "./api-client";

export interface AppRef {
  id: string;
  label: string;
}

/**
 * Datafeature — résout via l'API les données réelles dont un protocole a besoin (lecture seule).
 * Chaque résolveur renvoie `null` si la donnée n'existe pas dans le jeu courant : le test appelant
 * doit alors se `skip` proprement (pas de faux échec dû à un seed différent).
 */
export class DataFeature {
  constructor(private readonly api: ApiClient) {}

  /** Première application du catalogue. */
  async firstApplication(): Promise<AppRef | null> {
    const page = await this.api.applications("pageSize=1&page=0");
    return page?.results?.[0] ?? null;
  }

  /** Une application possédant au moins une relation inter-applications. */
  async applicationWithRelations(probe = 15): Promise<AppRef | null> {
    const list = await this.api.applications(`pageSize=${probe}&page=0`);
    for (const app of list?.results ?? []) {
      const detail = await this.api.application(app.id);
      if (detail && hasNonEmptyRelations(detail)) return app;
    }
    return null;
  }

  /** Une application sur laquelle l'utilisateur courant a des droits contextuels (`my-perms`). */
  async applicationWithMyPerms(probe = 15): Promise<AppRef | null> {
    const list = await this.api.applications(`pageSize=${probe}&page=0`);
    for (const app of list?.results ?? []) {
      const perms = await this.api.myPerms(app.id);
      if (perms && perms.length > 0) return app;
    }
    return null;
  }

  /** Un signalement existant. */
  async anyReport(): Promise<{ id: string } | null> {
    const page = await this.api.reports("pageSize=1&page=0");
    return page?.results?.[0] ?? null;
  }

  /** Profil de l'utilisateur connecté. */
  currentUser() {
    return this.api.me();
  }

  // --- Provisioning pour les tests de permissions (effectué avec le token admin) ---

  /** Récupère un utilisateur (admin) par email. */
  getUser(email: string) {
    return this.api.userByEmail(email);
  }

  /** Affecte un rôle à un utilisateur. */
  async setUserRole(email: string, role: string): Promise<void> {
    const user = await this.api.userByEmail(email);
    if (!user) throw new Error(`Utilisateur introuvable: ${email}`);
    await this.api.setUser(user.id, { role });
  }

  /** Affecte des permissions additionnelles (et force le rôle READER pour isoler l'effet). */
  async setUserAdditionalPermissions(
    email: string,
    permissions: string[],
  ): Promise<void> {
    const user = await this.api.userByEmail(email);
    if (!user) throw new Error(`Utilisateur introuvable: ${email}`);
    await this.api.setUser(user.id, {
      role: "READER",
      additionalPermissions: permissions,
    });
  }

  /** Rétablit un utilisateur à l'état Lecteur sans permission additionnelle. */
  async resetUser(email: string): Promise<void> {
    const user = await this.api.userByEmail(email);
    if (!user) return;
    await this.api.setUser(user.id, {
      role: "READER",
      additionalPermissions: [],
    });
  }

  // --- Abonnements & digest (SIG-10), avec le token de l'utilisateur courant ---
  enableEmailNotifications() {
    return this.api.setEmailNotifications(true);
  }

  subscribe(appId: string) {
    return this.api.subscribe(appId);
  }

  unsubscribe(appId: string) {
    return this.api.unsubscribe(appId);
  }

  modifyApplication(appId: string, body: Record<string, unknown>) {
    return this.api.updateApplication(appId, body);
  }

  triggerDigest(day: "today" | "yesterday" = "today") {
    return this.api.triggerDigest(day);
  }
}

/** Détecte une liste de relations non vide quel que soit le nom du champ dans le DTO. */
function hasNonEmptyRelations(detail: Record<string, unknown>): boolean {
  const candidates = [
    "relations",
    "relationsAsSource",
    "relationsAsTarget",
    "relationships",
  ];
  return candidates.some(
    (key) =>
      Array.isArray(detail[key]) && (detail[key] as unknown[]).length > 0,
  );
}
