import { type Page } from "@playwright/test";

/**
 * Récupère l'access token OIDC depuis le storage du navigateur après connexion.
 * `oidc-client-ts` range l'utilisateur sous une clé `oidc.user:<authority>:<clientId>`.
 */
async function readAccessToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const stores: Storage[] = [window.sessionStorage, window.localStorage];
    for (const store of stores) {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (!key || !key.startsWith("oidc.user:")) continue;
        try {
          const parsed = JSON.parse(store.getItem(key) ?? "{}") as {
            access_token?: string;
          };
          if (parsed.access_token) return parsed.access_token;
        } catch {
          // clé non parsable : on ignore
        }
      }
    }
    return null;
  });
}

export interface Paginated<T> {
  results: T[];
  total: number;
}

/**
 * Client API minimal pour la datafeature : lit `/api/v2` en réutilisant le contexte réseau de la
 * page (proxy Vite) avec le Bearer token OIDC courant. Lecture seule.
 */
export class ApiClient {
  private constructor(
    private readonly page: Page,
    private readonly token: string,
  ) {}

  /** Construit le client depuis une page déjà authentifiée. */
  static async fromPage(page: Page): Promise<ApiClient> {
    const token = await readAccessToken(page);
    if (!token) {
      throw new Error(
        "Datafeature: aucun access token OIDC trouvé — l'utilisateur est-il connecté ?",
      );
    }
    return new ApiClient(page, token);
  }

  private async get<T>(path: string): Promise<T | null> {
    const res = await this.page.request.get(`/api/v2${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
      },
    });
    if (!res.ok()) return null;
    return (await res.json()) as T;
  }

  applications(
    query = "",
  ): Promise<Paginated<{ id: string; label: string }> | null> {
    return this.get<Paginated<{ id: string; label: string }>>(
      `/applications${query ? `?${query}` : ""}`,
    );
  }

  application(id: string): Promise<Record<string, unknown> | null> {
    return this.get(`/applications/${id}`);
  }

  myPerms(id: string): Promise<string[] | null> {
    return this.get<string[]>(`/applications/${id}/my-perms`);
  }

  reports(query = ""): Promise<Paginated<{ id: string }> | null> {
    return this.get<Paginated<{ id: string }>>(
      `/reports${query ? `?${query}` : ""}`,
    );
  }

  /** Historique global des modifications (metadatas). */
  metadatas(query = ""): Promise<Paginated<{ id: string }> | null> {
    return this.get<Paginated<{ id: string }>>(
      `/metadatas${query ? `?${query}` : ""}`,
    );
  }

  /** Données (data-catalog) d'une application. */
  applicationData(appId: string): Promise<Paginated<{ id: string }> | null> {
    return this.get<Paginated<{ id: string }>>(
      `/data-catalog/applications/${appId}?pageSize=10&page=0`,
    );
  }

  /** Directions de métier (business divisions). */
  businessDivisions(
    query = "",
  ): Promise<Paginated<{ id: string; label: string }> | null> {
    return this.get<Paginated<{ id: string; label: string }>>(
      `/business-division${query ? `?${query}` : ""}`,
    );
  }

  /** Tags du référentiel. */
  tags(query = ""): Promise<Paginated<{ id: string; name: string }> | null> {
    return this.get<Paginated<{ id: string; name: string }>>(
      `/tags${query ? `?${query}` : ""}`,
    );
  }

  me(): Promise<{ id: string; email: string } | null> {
    return this.get<{ id: string; email: string }>(`/users/me`);
  }

  /** Millésimes de campagne dette IT disponibles (triés du plus récent au plus ancien). */
  technicalDebtMillesimes(): Promise<number[] | null> {
    return this.get<number[]>(`/technical-debts/millesimes`);
  }

  /** Campagnes dette IT (millésimes) gérées par l'admin, actives, triées desc. */
  mditCampaigns(): Promise<Paginated<{ id: string; year: number }> | null> {
    return this.get<Paginated<{ id: string; year: number }>>(
      `/mdit-campaigns?onlyActive=true&pageSize=100&page=0`,
    );
  }

  /** Crée une campagne dette IT (requiert AdminPanelManage). */
  createMditCampaign(
    body: Record<string, unknown>,
  ): Promise<{ id: string; year: number } | null> {
    return this.post<{ id: string; year: number }>(`/mdit-campaigns`, body);
  }

  /** Supprime la campagne du millésime donné si elle existe (idempotence des tests). */
  async deleteMditCampaignByYear(year: number): Promise<void> {
    const list = await this.get<Paginated<{ id: string; year: number }>>(
      `/mdit-campaigns?pageSize=100&page=0`,
    );
    const found = list?.results?.find((c) => c.year === year);
    if (found) await this.del(`/mdit-campaigns/${found.id}`);
  }

  /** Crée une évaluation de dette technique (campagne `millesime`) pour une application. */
  createTechnicalDebtInfo(
    appId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string; millesime?: number } | null> {
    return this.post<{ id: string; millesime?: number }>(
      `/applications/${appId}/technical-debt-info`,
      body,
    );
  }

  /** Profil complet de l'utilisateur courant (inclut `organization`). */
  meRaw(): Promise<Record<string, unknown> | null> {
    return this.get<Record<string, unknown>>(`/users/me`);
  }

  // --- Écriture (provisioning pour les tests de permissions) ---

  private async patch<T>(path: string, body: unknown): Promise<T | null> {
    const res = await this.page.request.patch(`/api/v2${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: body,
    });
    if (!res.ok()) return null;
    return (await res.json()) as T;
  }

  /**
   * Tente de démarrer une impersonation et renvoie le code HTTP brut (sans suivre la redirection
   * d'identité). `impersonateUserId` permet de simuler une requête déjà impersonnée (chaînage).
   */
  async impersonateStatus(
    targetId: string,
    opts: { impersonateUserId?: string } = {},
  ): Promise<number> {
    const res = await this.page.request.post(
      `/api/v2/users/${targetId}/impersonate`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          ...(opts.impersonateUserId
            ? { "x-impersonate-user-id": opts.impersonateUserId }
            : {}),
        },
      },
    );
    return res.status();
  }

  /** Crée un token de service (génère un compte de service `bot` côté backend). */
  createServiceToken(body: {
    name: string;
    description: string;
    expiresAt: string;
    role: string;
  }): Promise<{ id: string } | null> {
    return this.post<{ id: string }>("/tokens", body);
  }

  /** Révoque (supprime) un token de service. */
  deleteToken(id: string): Promise<boolean> {
    return this.del(`/tokens/${id}`);
  }

  /** Récupère un utilisateur par email (recherche admin). */
  async userByEmail(email: string): Promise<UserAdmin | null> {
    const page = await this.get<Paginated<UserAdmin>>(
      `/users?search=${encodeURIComponent(email)}&pageSize=20&page=0`,
    );
    return page?.results?.find((u) => u.email === email) ?? null;
  }

  /** Met à jour le rôle, les permissions, l'organisation et/ou le périmètre d'un utilisateur. */
  setUser(
    id: string,
    body: {
      role?: string;
      additionalPermissions?: string[];
      organizationId?: string | null;
      scopeOrganizationId?: string | null;
    },
  ): Promise<UserAdmin | null> {
    return this.patch<UserAdmin>(`/users/${id}`, body);
  }

  private async post<T>(path: string, body: unknown = {}): Promise<T | null> {
    const res = await this.page.request.post(`/api/v2${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: body,
    });
    if (!res.ok()) return null;
    return (res.status() === 204 ? null : ((await res.json()) as T)) ?? null;
  }

  private async del(path: string): Promise<boolean> {
    const res = await this.page.request.delete(`/api/v2${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
      },
    });
    return res.ok();
  }

  // --- Abonnements / modif appli / préférences / digest (SIG-10) ---
  subscribe(appId: string): Promise<unknown> {
    return this.post(`/users/me/subscribe/${appId}`);
  }

  unsubscribe(appId: string): Promise<boolean> {
    return this.del(`/users/me/subscribe/${appId}`);
  }

  updateApplication(
    id: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.patch(`/applications/${id}`, body);
  }

  setEmailNotifications(enabled: boolean): Promise<unknown> {
    return this.patch(`/users/me`, { emailNotificationsEnabled: enabled });
  }

  triggerDigest(day: "today" | "yesterday" = "today"): Promise<unknown> {
    return this.post(`/email/digest?day=${day}`);
  }

  // --- CRUD helpers (CRU-* tests) ---

  async createApplication(
    body: Record<string, unknown>,
  ): Promise<{ id: string; label: string } | null> {
    const res = await this.page.request.post(`/api/v2/applications`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: body,
    });
    if (!res.ok()) {
      const text = await res.text().catch(() => "");
      console.error(`POST /applications ${res.status()}: ${text}`);
      return null;
    }
    return (await res.json()) as { id: string; label: string };
  }

  deleteApplication(id: string): Promise<boolean> {
    return this.del(`/applications/${id}`);
  }

  createActor(
    appId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string } | null> {
    return this.post<{ id: string }>(`/applications/${appId}/actors`, body);
  }

  deleteActor(appId: string, actorId: string): Promise<boolean> {
    return this.del(`/applications/${appId}/actors/${actorId}`);
  }

  updateActor(
    appId: string,
    actorId: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.patch(`/applications/${appId}/actors/${actorId}`, body);
  }

  actors(
    appId: string,
  ): Promise<
    | { id: string; firstname?: string; lastname?: string; isGroup?: boolean }[]
    | null
  > {
    return this.get<
      { id: string; firstname?: string; lastname?: string; isGroup?: boolean }[]
    >(`/applications/${appId}/actors`);
  }

  createStatus(
    appId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string } | null> {
    return this.post<{ id: string }>(`/applications/${appId}/statuses`, body);
  }

  deleteStatus(appId: string, statusId: string): Promise<boolean> {
    return this.del(`/applications/${appId}/statuses/${statusId}`);
  }

  statuses(appId: string): Promise<{ id: string }[] | null> {
    return this.get<{ id: string }[]>(`/applications/${appId}/statuses`);
  }

  createRelation(
    appId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string } | null> {
    return this.post<{ id: string }>(`/applications/${appId}/relations`, body);
  }

  deleteRelation(appId: string, relationId: string): Promise<boolean> {
    return this.del(`/applications/${appId}/relations/${relationId}`);
  }

  relations(appId: string): Promise<{ id: string }[] | null> {
    return this.get<{ id: string }[]>(`/applications/${appId}/relations`);
  }

  createLink(
    appId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string } | null> {
    return this.post<{ id: string }>(`/applications/${appId}/links`, body);
  }

  deleteLink(appId: string, linkId: string): Promise<boolean> {
    return this.del(`/applications/${appId}/links/${linkId}`);
  }

  links(appId: string): Promise<{ id: string }[] | null> {
    return this.get<{ id: string }[]>(`/applications/${appId}/links`);
  }

  createHosting(
    appId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string } | null> {
    return this.post<{ id: string }>(`/applications/${appId}/hostings`, body);
  }

  deleteHosting(appId: string, hostingId: string): Promise<boolean> {
    return this.del(`/applications/${appId}/hostings/${hostingId}`);
  }

  hostings(appId: string): Promise<{ id: string }[] | null> {
    return this.get<{ id: string }[]>(`/applications/${appId}/hostings`);
  }

  createLabel(
    appId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string } | null> {
    return this.post<{ id: string }>(`/applications/${appId}/labels`, body);
  }

  deleteLabel(appId: string, labelId: string): Promise<boolean> {
    return this.del(`/applications/${appId}/labels/${labelId}`);
  }

  labels(appId: string): Promise<{ id: string; value?: string }[] | null> {
    return this.get<{ id: string; value?: string }[]>(
      `/applications/${appId}/labels`,
    );
  }

  createRgaa(
    appId: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string } | null> {
    return this.post<{ id: string }>(
      `/applications/${appId}/rgaa-compliances`,
      body,
    );
  }

  deleteRgaa(appId: string, rgaaId: string): Promise<boolean> {
    return this.del(`/applications/${appId}/rgaa-compliances/${rgaaId}`);
  }

  rgaaCompliances(appId: string): Promise<{ id: string }[] | null> {
    return this.get<{ id: string }[]>(
      `/applications/${appId}/rgaa-compliances`,
    );
  }

  actorTypes(): Promise<{ id: string; label: string }[] | null> {
    return this.get<{ id: string; label: string }[]>("/actor-types");
  }

  organizations(
    query: string,
  ): Promise<{ id: string; label: string; path: string }[] | null> {
    return this.get<{ id: string; label: string; path: string }[]>(
      `/organizations?search=${encodeURIComponent(query)}&pageSize=5`,
    );
  }

  createOrganization(
    body: Record<string, unknown>,
  ): Promise<{ id: string; path: string } | null> {
    return this.post<{ id: string; path: string }>("/organizations", body);
  }

  deleteOrganization(id: string): Promise<boolean> {
    return this.del(`/organizations/${id}`);
  }

  createTag(body: {
    name: string;
  }): Promise<{ id: string; name: string } | null> {
    return this.post<{ id: string; name: string }>("/tags", body);
  }

  deleteTag(id: string): Promise<boolean> {
    return this.del(`/tags/${id}`);
  }

  createLabelSource(body: {
    source: string;
  }): Promise<{ id: string; source: string } | null> {
    return this.post<{ id: string; source: string }>("/label-sources", body);
  }

  deleteLabelSource(id: string): Promise<boolean> {
    return this.del(`/label-sources/${id}`);
  }

  /** Liste paginée des sources de noms alternatifs (utilisée par le nettoyage global). */
  labelSources(
    query = "",
  ): Promise<Paginated<{ id: string; source: string }> | null> {
    return this.get<Paginated<{ id: string; source: string }>>(
      `/label-sources${query ? `?${query}` : ""}`,
    );
  }

  // --- Conformités (provisioning éco-index / homologation, requiert ComplianceWrite) ---
  compliance(appId: string): Promise<ComplianceShape | null> {
    return this.get<ComplianceShape>(`/applications/${appId}/compliances`);
  }

  setCompliance(
    appId: string,
    body: Partial<ComplianceShape>,
  ): Promise<ComplianceShape | null> {
    return this.patch<ComplianceShape>(
      `/applications/${appId}/compliances`,
      body,
    );
  }
}

export interface UserAdmin {
  id: string;
  email: string;
  role: string;
  additionalPermissions: string[];
}

/** Champs de conformité utiles aux tests (sous-ensemble du DTO backend). */
export interface ComplianceShape {
  id: string;
  homologation_status: string | null;
  eco_index_target_url: string | null;
  eco_index_score: number | null;
}
