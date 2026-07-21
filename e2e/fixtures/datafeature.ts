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
   * Une application dont le libellé contient une ponctuation **interne** (entre deux
   * caractères alphanumériques, sans espace) — ex. « O'Kon », « QA-GROUP-CHILD ».
   * Sert à vérifier qu'un tel nom reste trouvable en le tapant en entier dans la
   * recherche du header : non-régression du bug de tokenisation (la ponctuation doit
   * être découpée, pas supprimée-collée en un lexème absent de l'index). `null` si le
   * jeu courant n'en contient aucune.
   */
  async applicationWithPunctuationInLabel(): Promise<AppRef | null> {
    const internalPunct = /[\p{L}\p{N}][^\p{L}\p{N}\s][\p{L}\p{N}]/u;
    const pageSize = 100; // plafond API ; on pagine car les noms ponctués (O…, Q…) sont plus loin.
    for (let page = 0; page < 30; page++) {
      const res = await this.api.applications(
        `pageSize=${pageSize}&page=${page}`,
      );
      const results = res?.results ?? [];
      const match = results.find((a) => internalPunct.test(a.label));
      if (match) return match;
      if (results.length < pageSize) break; // dernière page atteinte
    }
    return null;
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

  // --- Historique des modifications (HIS-12) ---
  //
  // Le journal des `Metadata` est **généré automatiquement** par le backend en réaction à des
  // actions (création/modification d'application, etc.) : il n'y a pas de droit d'écriture dédié
  // (cf. `permissions.prisma` : « MetadataRead // Voir l'historique des metadonnees. Pas de write :
  // donnees generees automatiquement »), donc aucun `POST /metadatas`. On ne peut donc pas semer une
  // entrée directement ; en revanche on peut **provoquer** sa création en écrivant sur une ressource
  // qu'elle documente (`applications.service.ts` → `MetadatasService.createMetadata`) :
  //   - `POST /applications` déclenche une entrée `action=add` dont la description tient sur une
  //     seule ligne (titre seul, pas de diff de champs) → profil "mono-ligne" (HIS-12 cas 1).
  //   - `PATCH /applications/{id}` (avec un champ suivi réellement modifié, ex. `label`) déclenche
  //     une entrée `action=update` dont la description tient sur 3 lignes (titre + « Ancienne(s)
  //     valeur(s) » + « Nouvelle(s) valeur(s) ») → profil "multi-ligne" (HIS-12 cas 2).
  // Stratégie retenue : lecture API pure d'abord (`findMonoLineMetadata`/`findMultiLineMetadata`,
  // pattern `anyMetadata`) ; si le jeu courant ne contient aucune entrée du profil recherché parmi
  // les plus récentes, on sème "create-if-absent" via une application de test jetable
  // (`ensureMonoLineMetadata`/`ensureMultiLineMetadata`), nettoyée par l'appelant (`removeApplication`
  // en `finally`) — la suppression cascade sur ses `Metadata` (`onDelete: Cascade` côté schéma).

  /**
   * Une entrée existante de l'historique dont la description est mono-ligne (pas de `\n`), parmi
   * les `probe` plus récentes, ou `null` si aucune ne correspond.
   */
  async findMonoLineMetadata(probe = 50): Promise<{ id: string } | null> {
    const list = await this.api.metadatas(
      `pageSize=${probe}&page=0&sortBy=createdAt&order=desc`,
    );
    return (
      list?.results?.find(
        (m) => (m.description ?? "").split("\n").length === 1,
      ) ?? null
    );
  }

  /**
   * Une entrée existante de l'historique dont la description est multi-ligne (≥ 2 lignes), parmi
   * les `probe` plus récentes, ou `null` si aucune ne correspond.
   */
  async findMultiLineMetadata(probe = 50): Promise<{ id: string } | null> {
    const list = await this.api.metadatas(
      `pageSize=${probe}&page=0&sortBy=createdAt&order=desc`,
    );
    return (
      list?.results?.find(
        (m) => (m.description ?? "").split("\n").length > 1,
      ) ?? null
    );
  }

  /**
   * Garantit une entrée d'historique à description mono-ligne (HIS-12 cas 1 : le bloc
   * `description-details` ne doit PAS apparaître). Lit d'abord le jeu courant ; à défaut, sème une
   * application de test (`POST /applications`, `action=add` → description mono-ligne garantie) et
   * renvoie l'id de la metadata créée. `seededAppId` est non nul uniquement si une application a été
   * créée pour l'occasion : l'appelant doit alors la supprimer (`removeApplication`) en `finally`.
   */
  async ensureMonoLineMetadata(): Promise<{
    metadataId: string;
    seededAppId: string | null;
  } | null> {
    const existing = await this.findMonoLineMetadata();
    if (existing) return { metadataId: existing.id, seededAppId: null };

    const label = `E2E-HIS12-mono-${Date.now()}`;
    const app = await this.createTestApplication(label);
    const list = await this.api.applicationMetadatas(
      app.id,
      "pageSize=5&page=0&sortBy=createdAt&order=desc",
    );
    const entry = list?.results?.find(
      (m) => (m.description ?? "").split("\n").length === 1,
    );
    if (!entry) {
      await this.removeApplication(app.id);
      return null;
    }
    return { metadataId: entry.id, seededAppId: app.id };
  }

  /**
   * Garantit une entrée d'historique à description multi-ligne (HIS-12 cas 2 : le bloc
   * `description-details` doit apparaître avec au moins une `.detail-line`). Lit d'abord le jeu
   * courant ; à défaut, sème une application de test puis modifie son libellé (`PATCH
   * /applications/{id}`, `action=update` avec un champ réellement changé → description sur 3 lignes
   * garantie) et renvoie l'id de la metadata créée. `seededAppId` est non nul uniquement si une
   * application a été créée pour l'occasion : l'appelant doit alors la supprimer
   * (`removeApplication`) en `finally`.
   */
  async ensureMultiLineMetadata(): Promise<{
    metadataId: string;
    seededAppId: string | null;
  } | null> {
    const existing = await this.findMultiLineMetadata();
    if (existing) return { metadataId: existing.id, seededAppId: null };

    const label = `E2E-HIS12-multi-${Date.now()}`;
    const app = await this.createTestApplication(label);
    await this.modifyApplication(app.id, { label: `${label}-modifiee` });
    const list = await this.api.applicationMetadatas(
      app.id,
      "pageSize=5&page=0&sortBy=createdAt&order=desc",
    );
    const entry = list?.results?.find(
      (m) => (m.description ?? "").split("\n").length > 1,
    );
    if (!entry) {
      await this.removeApplication(app.id);
      return null;
    }
    return { metadataId: entry.id, seededAppId: app.id };
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

  /**
   * Une application possédant ≥ 1 tag, avec la valeur du premier, pour vérifier que le clic sur un
   * tag dans l'onglet « Informations générales » navigue vers `/recherche-application?tag=<valeur>`
   * (FIC-21). Lecture API d'abord (`probe` premières applications, détail par détail comme
   * `applicationWithRelations`) ; à défaut, sème « create-if-absent » sur la première application.
   *
   * Le `PATCH /applications/{id}` fait un `set:` complet sur la relation tags côté backend
   * (`TagsService.findByNames`, voir `application.service.ts:131-133`) : on **ajoute** donc le tag
   * au tableau des tags existants de l'application plutôt que de le remplacer, pour ne pas effacer
   * silencieusement les tags déjà posés par d'autres tests/campagnes partagées. `TagsService
   * .findByNames` ne crée aucun tag à la volée : le nom doit exister au préalable (`firstTag`, sinon
   * `createTag`).
   *
   * Les tags créés pour ce test ne sont pas nettoyés — cohérent avec les autres résolveurs
   * create-if-absent de ce fichier (ex. `applicationWithTechnicalDebt`) : un tag est une donnée
   * référentielle réutilisable, pas un état à restaurer.
   */
  async applicationWithTags(
    probe = 15,
  ): Promise<{ app: AppRef; tagValue: string } | null> {
    const list = await this.api.applications(`pageSize=${probe}&page=0`);
    for (const app of list?.results ?? []) {
      const detail = await this.api.application(app.id);
      const tags = detail?.tags;
      if (
        Array.isArray(tags) &&
        tags.length > 0 &&
        typeof tags[0] === "string"
      ) {
        return { app, tagValue: tags[0] };
      }
    }

    const target = list?.results?.[0];
    if (!target) return null;

    let tag = await this.firstTag();
    if (!tag) {
      tag = await this.createTag(`E2E-FIC21-${Date.now()}`);
    }
    if (!tag) return null;

    const detail = await this.api.application(target.id);
    const currentTags = Array.isArray(detail?.tags)
      ? (detail.tags as unknown[]).filter(
          (t): t is string => typeof t === "string",
        )
      : [];
    const nextTags = currentTags.includes(tag.name)
      ? currentTags
      : [...currentTags, tag.name];

    const updated = await this.modifyApplication(target.id, {
      tags: nextTags,
    });
    if (!updated) return null;

    return { app: target, tagValue: tag.name };
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

  // --- Feature flags (FLG-*, provisioning + restauration, token admin) ---

  /**
   * États initiaux des flags touchés pendant le test. La fixture `data` les
   * restaure dans son teardown — qui s'exécute même après un TIMEOUT du test,
   * là où un `finally` de corps de test ne tournerait pas.
   */
  private touchedFlags = new Map<string, boolean>();

  /** Liste des feature flags, ou `null` si l'endpoint ne répond pas. */
  featureFlags() {
    return this.api.featureFlags();
  }

  /** État courant d'un flag par clé, ou `null` si le flag n'existe pas. */
  async featureFlagState(key: string): Promise<boolean | null> {
    const flags = await this.api.featureFlags();
    const flag = flags?.find((f) => f.key === key);
    return flag ? flag.enabled : null;
  }

  /**
   * Mémorise l'état courant d'un flag pour restauration automatique en fin de
   * test. À appeler AVANT une bascule faite hors datafeature (ex. via l'UI).
   */
  async trackFeatureFlag(key: string): Promise<void> {
    if (this.touchedFlags.has(key)) return;
    const current = await this.featureFlagState(key);
    if (current !== null) this.touchedFlags.set(key, current);
  }

  /** Active/désactive un feature flag (état global, restauré par la fixture `data`). */
  async setFeatureFlag(key: string, enabled: boolean): Promise<void> {
    await this.trackFeatureFlag(key);
    await this.api.setFeatureFlag(key, enabled);
  }

  /** Restaure tous les flags touchés (appelée par le teardown de la fixture `data`). */
  async restoreFeatureFlags(): Promise<void> {
    for (const [key, original] of this.touchedFlags) {
      try {
        await this.api.setFeatureFlag(key, original);
      } catch {
        // best-effort : la page peut être en cours de fermeture
      }
    }
    this.touchedFlags.clear();
  }

  // --- CRUD resolvers (CRU-* tests) ---

  async createTestApplication(label: string): Promise<AppRef> {
    const created = await this.api.createApplication({
      label,
      shortName: label,
      description: `Auto-created by e2e test: ${label}`,
      tags: [],
      // `status` est requis par l'API (le service crée un ApplicationStatus initial :
      // `createApplicationDto.status.status`). L'omettre provoque un 500.
      status: {
        status: "under_construction",
        statusDate: new Date().toISOString(),
      },
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

  /**
   * Crée un type d'acteur dédié au test, **directement en base** : l'API de création n'expose pas
   * le flag `isAdmin`, et un type sans ligne de matrice `AppPermissions` n'accorde aucun droit —
   * c'est exactement le scénario voulu pour PRM-14/15 (les droits viennent alors *uniquement* de
   * `isAdmin`, matrice vide). SQL justifié : l'API ne permet pas de poser cet état. À supprimer en
   * `finally` (`deleteActorType`).
   */
  async createActorType(opts: {
    code: string;
    label: string;
    isAdmin: boolean;
  }): Promise<{ id: string }> {
    const rows = await dbQuery<{ id: string }>(
      `INSERT INTO "ActorType" (id, code, label, "isAdmin")
       VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id`,
      [opts.code, opts.label, opts.isAdmin],
    );
    return rows[0];
  }

  deleteActorType(id: string): Promise<unknown[]> {
    return dbQuery(`DELETE FROM "ActorType" WHERE id = $1`, [id]);
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
