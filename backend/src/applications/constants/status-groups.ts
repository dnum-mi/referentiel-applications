import { Status } from "@prisma/client";

/// Statuts « retirés du parc » : l'application n'est plus en service (#2250).
/// Source unique du prédicat « application inactive », réécrit jusqu'ici avec
/// des périmètres différents selon les usages (cron de relance, graphe…).
export const RETIRED_STATUSES = [
  Status.decommissioned,
  Status.deleted,
] as const;

export function isRetired(status?: Status | null): boolean {
  return (
    status != null && (RETIRED_STATUSES as readonly Status[]).includes(status)
  );
}

export function isDeleted(status?: Status | null): boolean {
  return status === Status.deleted;
}
