import { type Page } from "@playwright/test";
import { ApiClient, type PermsMatrixEntry } from "./api-client";
import { dbQuery } from "../support/db";

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

  /** Construit une datafeature depuis une page déjà authentifiée (rôle quelconque). */
  static async forPage(page: Page): Promise<DataFeature> {
    return new DataFeature(await ApiClient.fromPage(page));
  }

  /** Première application du catalogue. */
  async firstApplication(): Promise<AppRef | null> {
    const page = await this.api.applications("pageSize=1&page=0");
    return page?.results?.[0] ?? null;
  }

  /** Application dont le libellé correspond exactement (fixtures QA seedées). */
  async applicationByLabel(label: string): Promise<AppRef | null> {
    const page = await this.api.applications(
      `search=${encodeURIComponent(label)}&pageSize=20&page=0`,
    );
    return page?.results?.find((a) => a.label === label) ?? null;
  }

  /**
   * Une application possédant une évaluation de dette technique, afin que la carte « Dette
   * technique » (et son libellé « Maîtrise des coûts ») soit rendue sur l'onglet Informations
   * générales (FIC-15, ticket #1900). Sème l'évaluation « create-if-absent » sur la première
   * application si elle n'en a pas. Renvoie `null` si aucune application n'existe.
   */
  async applicationWithTechnicalDebt(): Promise<AppRef | null> {
    const app = await this.firstApplication();
    if (!app) return null;
    const existing = await this.api.applicationTechnicalDebtInfo(app.id);
    if (existing?.results?.length) return app;
    const created = await this.api.createTechnicalDebtInfo(app.id, {
      technicalMaturity: 3,
      businessMaturity: 3,
      costContainment: 3,
    });
    return created ? app : null;
  }

  /**
   * Sème une évaluation de dette technique dont la maîtrise des coûts est **non notée**
   * (`costContainment` omis → `null`) sur la première application, et la renvoie. Sert à vérifier
   * que la carte affiche « Non notée » pour un axe sans score (FIC-16, ticket #1900). Comme les
   * évaluations sont historisées, la plus récente — celle-ci — pilote l'affichage.
   */
  async seedTechnicalDebtWithoutCost(): Promise<AppRef | null> {
    const app = await this.firstApplication();
    if (!app) return null;
    const created = await this.api.createTechnicalDebtInfo(app.id, {
      technicalMaturity: 3,
      businessMaturity: 3,
    });
    return created ? app : null;
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

  /** Une entrée de l'historique global des modifications (metadata), ou `null` si le journal est vide. */
  async anyMetadata(): Promise<{ id: string } | null> {
    const page = await this.api.metadatas("pageSize=1&page=0");
    return page?.results?.[0] ?? null;
  }

  /** Une direction de métier (business division) du référentiel, ou `null` si aucune. */
  async firstBusinessDivision(): Promise<{ id: string; label: string } | null> {
    const page = await this.api.businessDivisions("pageSize=5&page=0");
    return page?.results?.[0] ?? null;
  }

  /** Un tag du référentiel, ou `null` si aucun. */
  async firstTag(): Promise<{ id: string; name: string } | null> {
    const page = await this.api.tags("pageSize=5&page=0");
    return page?.results?.[0] ?? null;
  }

  /** Une application possédant ≥ 1 donnée (data-catalog) + l'id de sa 1ʳᵉ donnée, ou `null`. */
  async applicationWithData(
    probe = 15,
  ): Promise<{ appId: string; dataId: string } | null> {
    const list = await this.api.applications(`pageSize=${probe}&page=0`);
    for (const app of list?.results ?? []) {
      const data = await this.api.applicationData(app.id);
      const first = data?.results?.[0];
      if (first) return { appId: app.id, dataId: first.id };
    }
    return null;
  }

  /** Profil de l'utilisateur connecté. */
  currentUser() {
    return this.api.me();
  }

  // --- Campagnes dette IT / millésimes (TIM-05/06) ---

  /** Millésimes des campagnes dette IT actives, triés du plus récent au plus ancien. */
  async availableCampaignYears(): Promise<number[]> {
    const list = await this.api.mditCampaigns();
    return (list?.results ?? [])
      .map((c) => c.year)
      .slice()
      .sort((a, b) => b - a);
  }

  /**
   * Garantit l'existence d'au moins deux campagnes dette IT afin de pouvoir tester
   * le sélecteur. Crée une campagne précédente (jamais future, pour ne pas altérer
   * la campagne la plus récente présentée par défaut) via l'API admin si besoin.
   * Renvoie les deux millésimes les plus récents `[latest, previous]`, ou `null`.
   */
  async ensureTwoCampaigns(): Promise<[number, number] | null> {
    const existing = await this.availableCampaignYears();
    if (existing.length >= 2) return [existing[0], existing[1]];

    const latest = existing[0] ?? new Date().getFullYear();
    if (existing.length === 0) {
      await this.api.createMditCampaign({ year: latest });
    }
    await this.api.createMditCampaign({ year: latest - 1 });

    const refreshed = await this.availableCampaignYears();
    return refreshed.length >= 2 ? [refreshed[0], refreshed[1]] : null;
  }

  /** Supprime la campagne d'un millésime si elle existe (idempotence des tests admin). */
  removeCampaignYear(year: number): Promise<void> {
    return this.api.deleteMditCampaignByYear(year);
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

  /** Comme `setUserAdditionalPermissions` avec diagnostic HTTP complet. */
  async setUserAdditionalPermissionsVerbose(
    email: string,
    permissions: string[],
  ): Promise<{ ok: boolean; status: number; body: string }> {
    const user = await this.api.userByEmail(email);
    if (!user) throw new Error(`Utilisateur introuvable: ${email}`);
    return this.api.setUserVerbose(user.id, {
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

  // --- Impersonation (#1764) ---

  /** Tente de démarrer une impersonation et renvoie le code HTTP (autorisations). */
  impersonateStatus(
    targetId: string,
    opts: { impersonateUserId?: string } = {},
  ): Promise<number> {
    return this.api.impersonateStatus(targetId, opts);
  }

  /** Id d'un compte de service (bot) du jeu de données, ou `null` si aucun. */
  async findBotUserId(): Promise<string | null> {
    const rows = await dbQuery<{ id: string }>(
      `SELECT id FROM "User" WHERE type = 'bot' LIMIT 1`,
    );
    return rows[0]?.id ?? null;
  }

  /** Crée un token de service (donc un compte `bot`) ; renvoie l'id du token, ou `null`. */
  async createServiceToken(name: string): Promise<string | null> {
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const token = await this.api.createServiceToken({
      name,
      description:
        "Compte de service éphémère pour la non-régression impersonation",
      expiresAt,
      role: "VISITOR",
    });
    return token?.id ?? null;
  }

  /** Révoque un token de service (nettoyage). */
  revokeToken(id: string): Promise<boolean> {
    return this.api.deleteToken(id);
  }

  /** Dernière entrée d'audit d'impersonation visant la cible `email`, ou `null`. */
  async latestImpersonationLog(
    email: string,
  ): Promise<{ startedAt: string; endedAt: string | null } | null> {
    const rows = await dbQuery<{ startedAt: string; endedAt: string | null }>(
      `SELECT l."startedAt", l."endedAt"
         FROM "ImpersonationLog" l
         JOIN "User" u ON u.id = l."targetId"
        WHERE u.email = $1
        ORDER BY l."startedAt" DESC
        LIMIT 1`,
      [email],
    );
    return rows[0] ?? null;
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

  // --- Conformités (provisioning déterministe pour CMP-*, avec le token admin) ---

  /** Conformité courante d'une application. */
  getCompliance(appId: string) {
    return this.api.compliance(appId);
  }

  /**
   * Fixe une URL cible et un score éco-index connus, directement en base.
   * `eco_index_score` n'est pas inscriptible via l'API (posé uniquement par un scan HTTP réel) → on
   * établit l'état de départ par SQL.
   */
  async setEcoIndex(appId: string, url: string, score: number): Promise<void> {
    await dbQuery(
      `UPDATE "Compliance"
         SET eco_index_target_url = $1,
             eco_index_score = $2,
             eco_index_last_calculated_at = NOW()
       WHERE "applicationId" = $3`,
      [url, score, appId],
    );
  }

  /** Affecte un statut d'homologation. */
  async setHomologationStatus(appId: string, status: string): Promise<void> {
    await this.api.setCompliance(appId, { homologation_status: status });
  }

  // --- CRUD resolvers (CRU-* tests) ---

  async createTestApplication(label: string): Promise<AppRef> {
    const created = await this.api.createApplication({
      label,
      shortName: label,
      description: `Auto-created by e2e test: ${label}`,
    });
    if (!created)
      throw new Error(`Création d'application impossible : ${label}`);
    return created;
  }

  removeApplication(id: string): Promise<boolean> {
    return this.api.deleteApplication(id);
  }

  async applicationWithActors(probe = 15): Promise<AppRef | null> {
    const list = await this.api.applications(`pageSize=${probe}&page=0`);
    for (const app of list?.results ?? []) {
      const actors = await this.api.actors(app.id);
      if (actors && actors.length > 0) return app;
    }
    return null;
  }

  actorTypes() {
    return this.api.actorTypes();
  }

  actors(appId: string) {
    return this.api.actors(appId);
  }

  createActor(appId: string, body: Record<string, unknown>) {
    return this.api.createActor(appId, body);
  }

  deleteActor(appId: string, actorId: string) {
    return this.api.deleteActor(appId, actorId);
  }

  createStatus(appId: string, body: Record<string, unknown>) {
    return this.api.createStatus(appId, body);
  }

  deleteStatus(appId: string, statusId: string) {
    return this.api.deleteStatus(appId, statusId);
  }

  statuses(appId: string) {
    return this.api.statuses(appId);
  }

  createRelation(appId: string, body: Record<string, unknown>) {
    return this.api.createRelation(appId, body);
  }

  deleteRelation(appId: string, relationId: string) {
    return this.api.deleteRelation(appId, relationId);
  }

  relations(appId: string) {
    return this.api.relations(appId);
  }

  createLink(appId: string, body: Record<string, unknown>) {
    return this.api.createLink(appId, body);
  }

  deleteLink(appId: string, linkId: string) {
    return this.api.deleteLink(appId, linkId);
  }

  links(appId: string) {
    return this.api.links(appId);
  }

  createHosting(appId: string, body: Record<string, unknown>) {
    return this.api.createHosting(appId, body);
  }

  deleteHosting(appId: string, hostingId: string) {
    return this.api.deleteHosting(appId, hostingId);
  }

  hostings(appId: string) {
    return this.api.hostings(appId);
  }

  createAppLabel(appId: string, body: Record<string, unknown>) {
    return this.api.createLabel(appId, body);
  }

  deleteAppLabel(appId: string, labelId: string) {
    return this.api.deleteLabel(appId, labelId);
  }

  appLabels(appId: string) {
    return this.api.labels(appId);
  }

  createRgaa(appId: string, body: Record<string, unknown>) {
    return this.api.createRgaa(appId, body);
  }

  deleteRgaa(appId: string, rgaaId: string) {
    return this.api.deleteRgaa(appId, rgaaId);
  }

  rgaaCompliances(appId: string) {
    return this.api.rgaaCompliances(appId);
  }

  applicationDetail(id: string): Promise<Record<string, unknown> | null> {
    return this.api.application(id);
  }

  applicationActors(appId: string) {
    return this.api.actors(appId);
  }

  // --- Admin CRUD resolvers (ADM-* tests) ---

  createOrganization(path: string, sigle?: string) {
    return this.api.createOrganization({ path, sigle });
  }

  deleteOrganization(id: string) {
    return this.api.deleteOrganization(id);
  }

  createTag(name: string) {
    return this.api.createTag({ name });
  }

  deleteTag(id: string) {
    return this.api.deleteTag(id);
  }

  createLabelSource(source: string) {
    return this.api.createLabelSource({ source });
  }

  deleteLabelSource(id: string) {
    return this.api.deleteLabelSource(id);
  }

  async anyOrganizationPath(): Promise<string | null> {
    const orgs = await this.api.organizations("a");
    if (orgs && orgs.length > 0) return orgs[0].path;
    const orgs2 = await this.api.organizations("direction");
    if (orgs2 && orgs2.length > 0) return orgs2[0].path;
    return null;
  }

  async twoApplications(): Promise<[AppRef, AppRef] | null> {
    const list = await this.api.applications("pageSize=2&page=0");
    if (!list?.results || list.results.length < 2) return null;
    return [list.results[0], list.results[1]];
  }

  // --- Matrice des permissions (PRM-12) ---

  permsMatrix(): Promise<PermsMatrixEntry[] | null> {
    return this.api.permsMatrix();
  }

  updatePermsMatrix(
    body: PermsMatrixEntry[],
  ): Promise<PermsMatrixEntry[] | null> {
    return this.api.updatePermsMatrix(body);
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
