export class StatsHelper {
  static readonly TIMEZONE = "Europe/Paris";

  /**
   * Retourne l'instant UTC correspondant à 00:00:00 dans le fuseau Europe/Paris
   * pour la date donnée.
   */
  static getUtcMidnightForParis(date: Date): Date {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // 1) On construit un timestamp UTC pour 00:00:00 de cette date
    const utcMidnightTs = Date.UTC(year, month, day, 0, 0, 0);

    // 2) On formate ce timestamp en "heure locale Paris" pour en extraire l'heure et la minute
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: StatsHelper.TIMEZONE,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = formatter.formatToParts(new Date(utcMidnightTs));
    const hourPart = parts.find((p) => p.type === "hour")!.value;
    const minutePart = parts.find((p) => p.type === "minute")!.value;
    const offsetMinutes = Number(hourPart) * 60 + Number(minutePart);

    // 3) On convertit cet offset en millisecondes et on le retire du timestamp UTC
    //    pour obtenir l'instant UTC équivalent à minuit Paris.
    return new Date(utcMidnightTs - offsetMinutes * 60_000);
  }
}
