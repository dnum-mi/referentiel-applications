import type { LocationQueryValue } from "vue-router";
import type {
  ApplicationControllerSearchData,
  ApplicationDto,
  TechnicalDebtControllerGetTechnicalDebtPointsResponses,
} from "@/client/types.gen";
import type { Ref } from "vue";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/api/index.js";
import { APPLICATION_STATUSES } from "@/constants/dictionary";
import { RELATION_TYPE_FILTERS } from "@/types/relation-type-filter";
import { useStatisticsStore } from "@/stores/statisticsStore";

export type TechnicalDebtPoint = TechnicalDebtControllerGetTechnicalDebtPointsResponses[200][number];

export type Filters = NonNullable<ApplicationControllerSearchData["query"]>;

export const DEFAULT_FILTERS: Filters = {
  label: undefined,
  tag: [],
  link: undefined,
  priorityRestart: undefined,
  // Tous les statuts sauf « supprimée » — dérivé de l'enum généré pour qu'un
  // nouveau statut apparaisse automatiquement dans la recherche par défaut (#2246).
  currentStatus__in: APPLICATION_STATUSES.filter((status) => status !== "deleted"),
  currentStatus__isNull: true,
  subscribersEmail: false,
  myApplications: false,
  compliancePresent__in: undefined,
  complianceAbsent__in: undefined,
  complianceUnset__in: undefined,
  page: 0,
  pageSize: 15,
  sortBy: "label",
  order: "asc",
  hostingSite: undefined,
  hostingPlatform: undefined,
  hostingProvider: undefined,
  hostingBuilding: undefined,
  hostingRoom: undefined,
  organization: undefined,
  actorType: undefined,
  actorEmail: undefined,
  iqGte: 0,
  iqLte: 100,
  iq__isNull: false,
  search: undefined,
  missingMoa: undefined,
  missingMoe: undefined,
  missingHosting: undefined,
  is_part_of: RELATION_TYPE_FILTERS.neutral,
  in_replacement_of: RELATION_TYPE_FILTERS.neutral,
  is_service_user_of: RELATION_TYPE_FILTERS.neutral,
  is_data_user_of: RELATION_TYPE_FILTERS.neutral,
  use_sso_of: RELATION_TYPE_FILTERS.neutral,
  is_mediation_service: RELATION_TYPE_FILTERS.neutral,
  relationAppId: undefined,
  businessDivisionId: [],
  dataSourceName: undefined,
  millesime: undefined,
};

// Le diagramme Time affiche l'ensemble des points de dette technique (pas de
// pagination) : la même liste de filtres que les applications, en ne
// surchargeant que ce qui diffère.
const TIME_DEFAULT_FILTERS: Filters = {
  ...DEFAULT_FILTERS,
  pageSize: 0,
};

// Shared state across components (singleton pattern)
const results = ref<ApplicationDto[]>([]);
const technicalDebtPoints = ref<ApplicationDto[]>([]);
const total = ref(0);
const averageIq = ref<number>(0);
const isLoading = ref(false);
const error = ref<string | null>(null);

// `filters` doit aussi être partagé : chaque composant de filtre (StatusFilter,
// QualityFilter, …) appelle son propre `useApplicationSearch()`, et un `ref`
// recréé à chaque appel donnait à chacun sa propre copie des filtres. Au moindre
// changement, `setFilter` réécrivait l'intégralité de la query d'URL depuis SA
// copie — potentiellement périmée vis-à-vis d'un changement fait entre-temps par
// un autre filtre — écrasant ce changement. D'où des cases à cocher qui semblaient
// nécessiter deux clics pour « prendre ». Initialisé au premier appel (a besoin de
// `route`, disponible uniquement depuis un composant), puis réutilisé tel quel.
let sharedFilters: Ref<Filters> | undefined;

// Filtres saisis au clavier (texte, curseurs) : la recherche est débouncée pour
// ne pas interroger l'API à chaque frappe. Les autres filtres (cases à cocher,
// tri, pagination) déclenchent une recherche immédiate, sans latence perçue.
const DEBOUNCED_FILTER_KEYS = new Set<string>([
  "search",
  "label",
  "link",
  "hostingSite",
  "hostingPlatform",
  "hostingProvider",
  "hostingBuilding",
  "hostingRoom",
  "organization",
  "actorEmail",
  "dataSourceName",
  "iqGte",
  "iqLte",
]);

// Timer partagé entre toutes les instances du composable : une seule recherche
// en attente à la fois, quel que soit le composant qui modifie les filtres.
let pendingSearchTimer: ReturnType<typeof setTimeout> | undefined;

// Identifiant de la dernière recherche « stockée » partie sur le réseau : une
// réponse dépassée par une requête plus récente ne doit pas écraser l'état.
let latestStoredSearchId = 0;

type QueryParam = LocationQueryValue | LocationQueryValue[];

function parseQueryParam(value: QueryParam): string | undefined {
  if (Array.isArray(value)) return value[0] ?? undefined;
  return value ?? undefined;
}

function parseQueryParamsEnum<const T extends string>(value: QueryParam): T | undefined {
  return parseQueryParam(value) as T | undefined;
}

function parseQueryParamBoolean(value: QueryParam): boolean | undefined {
  const str = parseQueryParam(value);
  if (str === "true") return true;
  if (str === "false") return false;
  return undefined;
}

function parseQueryParamNumber(value: QueryParam): number | undefined {
  const str = parseQueryParam(value);
  if (!str) return undefined;
  const num = Number.parseInt(str, 10);
  return Number.isNaN(num) ? undefined : num;
}

function parseQueryParamArray(value: QueryParam): string[] | undefined {
  if (!value) return undefined;
  const arr = Array.isArray(value) ? value : [value];
  const filtered = arr.filter((v): v is string => v !== null);
  const normalized = filtered
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
}

function sortAsStrings(values: readonly unknown[]): string[] {
  return values
    .map(String)
    .slice()
    .sort((a, b) => a.localeCompare(b));
}

function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function filtersToQuery(filters: Filters): Record<string, string> {
  const query: Record<string, string> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    const defaultValue = DEFAULT_FILTERS[key as keyof Filters];
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // Compare with defaults for arrays
      const sorted = sortAsStrings(value);
      if (Array.isArray(defaultValue) && sameStringArray(sorted, sortAsStrings(defaultValue))) continue;
      // Store arrays in the URL as CSV (more compact than explode).
      query[key] = sorted.join(",");
    } else {
      if (value === defaultValue) continue;
      query[key] = String(value);
    }
  }

  return query;
}

function queryToFilters(query: Record<string, LocationQueryValue | LocationQueryValue[]>): Filters {
  return {
    ...DEFAULT_FILTERS,
    label: parseQueryParam(query.label),
    tag: parseQueryParamArray(query.tag) ?? [],
    link: parseQueryParam(query.link),
    priorityRestart: parseQueryParamArray(query.priorityRestart) as Filters["priorityRestart"],
    currentStatus__in: (parseQueryParamArray(query.currentStatus__in) ?? DEFAULT_FILTERS.currentStatus__in) as Filters["currentStatus__in"],
    currentStatus__isNull: parseQueryParamBoolean(query.currentStatus__isNull) ?? DEFAULT_FILTERS.currentStatus__isNull,
    subscribersEmail: parseQueryParamBoolean(query.subscribersEmail) ?? DEFAULT_FILTERS.subscribersEmail,
    myApplications: parseQueryParamBoolean(query.myApplications) ?? DEFAULT_FILTERS.myApplications,
    compliancePresent__in: parseQueryParamArray(query.compliancePresent__in) as Filters["compliancePresent__in"],
    complianceAbsent__in: parseQueryParamArray(query.complianceAbsent__in) as Filters["complianceAbsent__in"],
    complianceUnset__in: parseQueryParamArray(query.complianceUnset__in) as Filters["complianceUnset__in"],
    page: parseQueryParamNumber(query.page) ?? 0,
    pageSize: parseQueryParamNumber(query.pageSize) ?? 15,
    sortBy: parseQueryParam(query.sortBy) ?? "label",
    order: (parseQueryParam(query.order) ?? "asc") as "asc" | "desc",
    hostingSite: parseQueryParam(query.hostingSite),
    hostingPlatform: parseQueryParam(query.hostingPlatform),
    hostingProvider: parseQueryParam(query.hostingProvider),
    hostingBuilding: parseQueryParam(query.hostingBuilding),
    hostingRoom: parseQueryParam(query.hostingRoom),
    organization: parseQueryParam(query.organization),
    actorType: parseQueryParam(query.actorType),
    actorEmail: parseQueryParam(query.actorEmail),
    iqGte: parseQueryParamNumber(query.iqGte) ?? 0,
    iqLte: parseQueryParamNumber(query.iqLte) ?? 100,
    iq__isNull: parseQueryParamBoolean(query.iq__isNull) ?? DEFAULT_FILTERS.iq__isNull,
    search: parseQueryParam(query.search),
    missingMoa: parseQueryParamBoolean(query.missingMoa),
    missingMoe: parseQueryParamBoolean(query.missingMoe),
    missingHosting: parseQueryParamBoolean(query.missingHosting),
    is_part_of: parseQueryParamsEnum(query.is_part_of) ?? DEFAULT_FILTERS.is_part_of,
    in_replacement_of: parseQueryParamsEnum(query.in_replacement_of) ?? DEFAULT_FILTERS.in_replacement_of,
    is_service_user_of: parseQueryParamsEnum(query.is_service_user_of) ?? DEFAULT_FILTERS.is_service_user_of,
    is_data_user_of: parseQueryParamsEnum(query.is_data_user_of) ?? DEFAULT_FILTERS.is_data_user_of,
    use_sso_of: parseQueryParamsEnum(query.use_sso_of) ?? DEFAULT_FILTERS.use_sso_of,
    is_mediation_service: parseQueryParamsEnum(query.is_mediation_service) ?? DEFAULT_FILTERS.is_mediation_service,
    relationAppId: parseQueryParam(query.relationAppId),
    businessDivisionId: parseQueryParamArray(query.businessDivisionId) ?? [],
    dataSourceName: parseQueryParam(query.dataSourceName),
    millesime: parseQueryParamNumber(query.millesime),
  };
}

function cleanFilters(filters: Filters): Filters {
  const cleaned: Filters = { ...filters };
  for (const [key, value] of Object.entries(cleaned)) {
    if (typeof value === "number") continue;
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
      delete cleaned[key as keyof Filters];
    }
  }
  return cleaned;
}

export function useApplicationSearch() {
  const route = useRoute();
  const router = useRouter();

  function scheduleSearch(immediate: boolean) {
    if (pendingSearchTimer) clearTimeout(pendingSearchTimer);
    // Même en mode immédiat, on passe par un timer à 0 ms : plusieurs
    // modifications de filtres dans un même tick (ex. initialisation d'une
    // page) sont ainsi coalescées en une seule requête.
    pendingSearchTimer = setTimeout(
      () => {
        pendingSearchTimer = undefined;
        // Les erreurs sont déjà capturées dans `error` par searchApplications.
        searchApplications().catch(() => {});
      },
      immediate ? 0 : 300,
    );
  }

  const filters = (sharedFilters ??= ref<Filters>({
    ...DEFAULT_FILTERS,
    ...queryToFilters(route.query),
  }));

  const page = computed({
    get: () => filters.value.page!,
    set: (val) => setFilter({ page: val }),
  });

  const pageSize = computed({
    get: () => filters.value.pageSize!,
    set: (val) => setFilter({ pageSize: val }),
  });

  function setFilter(values: Partial<Filters>) {
    Object.assign(filters.value, values);

    // Avoid keeping stale filter params in the URL when a filter is cleared.
    const nextQuery: Record<string, LocationQueryValue | LocationQueryValue[]> = { ...route.query };
    for (const key of Object.keys(DEFAULT_FILTERS)) {
      delete nextQuery[key];
    }
    Object.assign(nextQuery, filtersToQuery(filters.value));

    router.replace({ query: nextQuery });

    // Seule la saisie texte est débouncée ; cocher un filtre, trier ou changer
    // de page lance la recherche immédiatement.
    const needsDebounce = Object.keys(values).some((key) => DEBOUNCED_FILTER_KEYS.has(key));
    scheduleSearch(!needsDebounce);
  }

  function setOrder(ascending: boolean) {
    setFilter({ order: ascending ? "asc" : "desc" });
  }

  function resetFilters(defaults: Filters = DEFAULT_FILTERS) {
    filters.value = { ...defaults };
    router.replace({ query: {} });
    // Annule une éventuelle recherche débouncée en attente avant de relancer.
    scheduleSearch(true);
  }

  // `mergeCurrentFilters = false` : recherche indépendante des filtres de la page
  // courante (utilisée par la recherche globale du header, qui ne doit hériter ni
  // des filtres ni du tri de la page de recherche).
  async function searchApplications(customFilters?: Partial<Filters>, store = true, mergeCurrentFilters = true) {
    // Les appels « stockés » sont numérotés : si une requête plus récente est
    // partie entre-temps, la réponse courante est ignorée (anti-course).
    const searchId = store ? ++latestStoredSearchId : 0;
    const isCurrent = () => !store || searchId === latestStoredSearchId;

    if (store) {
      isLoading.value = true;
    }
    error.value = null;

    try {
      const currentFilters = { ...(mergeCurrentFilters ? filters.value : DEFAULT_FILTERS), ...customFilters };
      const query = cleanFilters(currentFilters);

      const response = await api.applicationControllerSearch({ query });

      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la recherche d'applications");
      }

      // Le total non filtré est mémoïsé dans le store : au plus un appel léger,
      // hors du chemin critique de la recherche.
      const statsStore = useStatisticsStore();
      statsStore.countApplications().catch(() => {});

      if (store && isCurrent()) {
        statsStore.countTechnicalDebtPoints(response.data.technicalDebtPoints.length ?? 0);

        const dataWithAverage = response.data;
        results.value = response.data.results;
        technicalDebtPoints.value = response.data.technicalDebtPoints;

        total.value = response.data.total;
        averageIq.value =
          typeof dataWithAverage.averageIq === "number" && Number.isFinite(dataWithAverage.averageIq) ? dataWithAverage.averageIq : 0;
      }

      return response.data;
    } catch (err: unknown) {
      if (isCurrent()) {
        error.value = err instanceof Error ? err.message : "Erreur inconnue";
      }
      throw err;
    } finally {
      if (store && isCurrent()) {
        isLoading.value = false;
      }
    }
  }

  async function fetchTechnicalDebtPoints(customFilters?: Partial<Filters>): Promise<TechnicalDebtPoint[]> {
    const currentFilters = { ...filters.value, ...customFilters };
    const { page: _page, pageSize: _pageSize, ...query } = cleanFilters(currentFilters);
    const response = await api.technicalDebtControllerGetTechnicalDebtPoints({ query, throwOnError: true });
    return response.data ?? [];
  }

  // Auto-search when filters change
  watch(
    () => route.query,
    (q) => {
      filters.value = {
        ...DEFAULT_FILTERS,
        ...queryToFilters(q),
      };
    },
  );

  return {
    filters,
    results,
    technicalDebtPoints,
    total,
    averageIq,
    page,
    pageSize,
    isLoading,
    error,
    DEFAULT_FILTERS,
    TIME_DEFAULT_FILTERS,
    searchApplications,
    fetchTechnicalDebtPoints,
    setFilter,
    setOrder,
    resetFilters,
  };
}
