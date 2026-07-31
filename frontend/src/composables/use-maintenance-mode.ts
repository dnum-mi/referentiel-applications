import { onMounted, onUnmounted, readonly, ref } from "vue";

const HEALTH_CHECK_URL = "/api/v2/health-check";
const POLLING_INTERVAL_MS = 30_000;

interface HealthCheckResponse {
  maintenance: boolean;
  version: string;
  etat: "OK" | "KO";
}

const maintenanceMode = ref(false);
export const maintenanceModeState = readonly(maintenanceMode);
let pollingTimer: ReturnType<typeof setInterval> | undefined;

export function isMaintenanceResponse(value: unknown): value is Pick<HealthCheckResponse, "maintenance"> {
  return typeof value === "object" && value !== null && "maintenance" in value && typeof value.maintenance === "boolean";
}

export function setMaintenanceMode(active: boolean): void {
  maintenanceMode.value = active;
}

export async function refreshMaintenanceMode(): Promise<void> {
  try {
    const response = await fetch(HEALTH_CHECK_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;

    const payload: unknown = await response.json();
    if (isMaintenanceResponse(payload)) {
      setMaintenanceMode(payload.maintenance);
    }
  } catch {
    // Conserver le dernier état connu en cas d'indisponibilité réseau.
  }
}

function startPolling(): void {
  if (pollingTimer) return;
  void refreshMaintenanceMode();
  pollingTimer = setInterval(() => {
    void refreshMaintenanceMode();
  }, POLLING_INTERVAL_MS);
}

function stopPolling(): void {
  if (!pollingTimer) return;
  clearInterval(pollingTimer);
  pollingTimer = undefined;
}

export function useMaintenanceMode() {
  onMounted(startPolling);
  onUnmounted(stopPolling);

  return {
    maintenanceMode: maintenanceModeState,
    refreshMaintenanceMode,
  };
}
