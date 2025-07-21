import requests from "./xhr-client";

export default class Stats {
  static async getMonthlyIqStats(): Promise<{ date: string; valeur: number }[]> {
    return await requests.get("/stats");
  }
}