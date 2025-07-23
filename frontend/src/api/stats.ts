// src/api/stats.ts
import type { IqAvg, GroupBy } from "@/models/Stat";
import requests from "./xhr-client";

const Stats = {
  /**
   * Récupère l’IQ moyen groupé sur la période spécifiée.
   * Si from/to ne sont pas fournis, le back applique les valeurs par défaut (6 derniers mois).
   */
  async getIqAvgGrouped(from?: string, to?: string, groupBy: GroupBy = "month"): Promise<IqAvg[]> {
    let path = `/stats/iq-avg/period?groupBy=${groupBy}`;
    if (from) path += `&from=${from}`;
    if (to) path += `&to=${to}`;
    return requests.get(path);
  },
};

export default Stats;
