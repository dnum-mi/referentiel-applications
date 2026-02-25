import type { LocationQueryValue } from "vue-router";
import type {
  ApplicationControllerSearchData,
  ApplicationDto,
  ApplicationSearchResultDto,
  TechnicalDebtControllerGetTechnicalDebtPointsResponses,
} from "@/client/types.gen";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/api/index.js";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import { RELATION_TYPE_FILTERS } from "@/types/relation-type-filter";

export type TechnicalDebtPoint = TechnicalDebtControllerGetTechnicalDebtPointsResponses[200][number];

export type Filters = NonNullable<ApplicationControllerSearchData["query"]>;

const DEFAULT_FILTERS: Filters = {
  label: undefined,
  tag: [],
  link: undefined,
  priorityRestart: undefined,
  currentStatus__in: ["under_construction", "poc", "in_production_mvp", "in_production", "in_production_decommissioning", "decommissioned"],
  currentStatus__isNull: true,
  compliance__in: undefined,
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
  search: undefined,
  missingMoa: undefined,
  missingMoe: undefined,
  missingHosting: undefined,
  is_part_of: RELATION_TYPE_FILTERS.neutral,
  in_replacement_of: RELATION_TYPE_FILTERS.neutral,
  is_service_user_of: RELATION_TYPE_FILTERS.neutral,
  is_data_user_of: RELATION_TYPE_FILTERS.neutral,
  use_sso_of: RELATION_TYPE_FILTERS.neutral,
  relationAppId: undefined,
  businessDivisionId: undefined,
};

// Shared state across components (singleton pattern)
const results = ref<ApplicationDto[]>([]);
const total = ref(0);
const averageIq = ref<number>(0);
const isLoading = ref(false);
const error = ref<string | null>(null);

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
  return values.map(String).slice().sort();
}

function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function filtersToQuery(filters: Filters): Record<string, string> {
  const query: Record<string, string> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // Compare with defaults for arrays
      const defaultValue = DEFAULT_FILTERS[key as keyof Filters];
      const sorted = sortAsStrings(value);
      if (Array.isArray(defaultValue) && sameStringArray(sorted, sortAsStrings(defaultValue))) continue;
      // Store arrays in the URL as CSV (more compact than explode).
      query[key] = sorted.join(",");
    } else if (typeof value === "number") {
      const defaultValue = DEFAULT_FILTERS[key as keyof Filters];
      if (value === defaultValue) continue;
      query[key] = String(value);
    } else {
      const defaultValue = DEFAULT_FILTERS[key as keyof Filters];
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
    currentStatus__isNull:
      parseQueryParam(query.currentStatus__isNull) === "true"
        ? true
        : parseQueryParam(query.currentStatus__isNull) === "false"
          ? false
          : DEFAULT_FILTERS.currentStatus__isNull,
    compliance__in: parseQueryParamArray(query.compliance__in) as Filters["compliance__in"],
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
    search: parseQueryParam(query.search),
    missingMoa: parseQueryParamBoolean(query.missingMoa),
    missingMoe: parseQueryParamBoolean(query.missingMoe),
    missingHosting: parseQueryParamBoolean(query.missingHosting),
    is_part_of: parseQueryParamsEnum(query.is_part_of) ?? DEFAULT_FILTERS.is_part_of,
    in_replacement_of: parseQueryParamsEnum(query.in_replacement_of) ?? DEFAULT_FILTERS.in_replacement_of,
    is_service_user_of: parseQueryParamsEnum(query.is_service_user_of) ?? DEFAULT_FILTERS.is_service_user_of,
    is_data_user_of: parseQueryParamsEnum(query.is_data_user_of) ?? DEFAULT_FILTERS.is_data_user_of,
    use_sso_of: parseQueryParamsEnum(query.use_sso_of) ?? DEFAULT_FILTERS.use_sso_of,
    relationAppId: parseQueryParam(query.relationAppId),
    businessDivisionId: parseQueryParam(query.businessDivisionId),
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

  const { run: debouncedSearch } = useDebouncedFn(() => searchApplications(), 300);

  const filters = ref<Filters>({
    ...DEFAULT_FILTERS,
    ...queryToFilters(route.query),
  });

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

    debouncedSearch();
  }

  function setOrder(ascending: boolean) {
    setFilter({ order: ascending ? "asc" : "desc" });
  }

  function resetFilters() {
    filters.value = { ...DEFAULT_FILTERS };
    router.replace({ query: {} });
    searchApplications();
  }

  async function searchApplications(customFilters?: Partial<Filters>, store = true) {
    if (store) {
      isLoading.value = true;
    }
    error.value = null;

    try {
      const currentFilters = { ...filters.value, ...customFilters };
      const query = cleanFilters(currentFilters);

      const response = await api.applicationControllerSearch({ query });

      if (!response.response.ok || !response.data) {
        throw new Error("Erreur lors de la recherche d'applications");
      }

      if (store) {
        const dataWithAverage = response.data as ApplicationSearchResultDto & {
          averageIq?: number;
        };
        results.value = response.data.results;
        total.value = response.data.total;
        averageIq.value =
          typeof dataWithAverage.averageIq === "number" && Number.isFinite(dataWithAverage.averageIq) ? dataWithAverage.averageIq : 0;
      }

      return response.data;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : "Erreur inconnue";
      throw err;
    } finally {
      if (store) {
        isLoading.value = false;
      }
    }
  }

  async function fetchTechnicalDebtPoints(customFilters?: Partial<Filters>): Promise<TechnicalDebtPoint[]> {
    const currentFilters = { ...filters.value, ...customFilters };
    const { page, pageSize, ...query } = cleanFilters(currentFilters);
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
    total,
    averageIq,
    page,
    pageSize,
    isLoading,
    error,
    DEFAULT_FILTERS,
    searchApplications,
    fetchTechnicalDebtPoints,
    setFilter,
    setOrder,
    resetFilters,
  };
}
