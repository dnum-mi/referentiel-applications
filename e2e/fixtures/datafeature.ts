import { ApiClient } from "./api-client";
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

  /** Millésimes de campagne dette IT disponibles, triés du plus récent au plus ancien. */
  async availableMillesimes(): Promise<number[]> {
    const list = await this.api.technicalDebtMillesimes();
    return (list ?? []).slice().sort((a, b) => b - a);
  }

  /**
   * Garantit l'existence d'au moins deux campagnes dette IT (millésimes) afin de
   * pouvoir tester le sélecteur. Sème une campagne précédente sur la première
   * application si nécessaire (jamais un millésime futur, pour ne pas altérer le
   * « plus récent » présenté par défaut). Renvoie les deux millésimes les plus
   * récents `[latest, previous]`, ou `null` si l'état ne peut être garanti.
   */
  async ensureTwoMillesimes(): Promise<[number, number] | null> {
    const existing = await this.availableMillesimes();
    if (existing.length >= 2) return [existing[0], existing[1]];

    const app = await this.firstApplication();
    if (!app) return null;

    const latest = existing[0] ?? new Date().getFullYear();
    const previous = latest - 1;
    if (existing.length === 0) {
      await this.api.createTechnicalDebtInfo(app.id, {
        technicalMaturity: 3,
        millesime: latest,
      });
    }
    await this.api.createTechnicalDebtInfo(app.id, {
      technicalMaturity: 2,
      millesime: previous,
    });

    const refreshed = await this.availableMillesimes();
    return refreshed.length >= 2 ? [refreshed[0], refreshed[1]] : null;
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
