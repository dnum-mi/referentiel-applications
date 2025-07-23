import {
  GroupBy,
  GroupedStat,
  StatEntry,
} from 'src/stats/interfaces/types/stats-entry.type';
import { StatsHelper } from './stats.helper';

/**
 * Agrégateur qui utilise uniquement le helper fourni pour le fuseau Europe/Paris et formate en ISO-like
 */
export class StatsAggregator {
  /**
   * Regroupe les entrées selon period et calcule moyenne, min, max, count
   */
  static groupByPeriod(data: StatEntry[], groupBy: GroupBy): GroupedStat[] {
    const grouped = new Map<string, number[]>();

    for (const entry of data) {
      // Normaliser la date au minuit Paris
      const dateAtParisMidnight = StatsHelper.getUtcMidnightForParis(
        entry.date,
      );
      let label: string;

      switch (groupBy) {
        case 'day':
          label = dateAtParisMidnight.toISOString().substring(0, 10);
          break;
        case 'week': {
          // Trouver le lundi de cette semaine (ISO, début lundi)
          const day = dateAtParisMidnight.getUTCDay(); // 0=Dimanche, 1=Lundi
          const diffToMonday = (day + 6) % 7;
          const monday = new Date(dateAtParisMidnight);
          monday.setUTCDate(dateAtParisMidnight.getUTCDate() - diffToMonday);
          label = monday.toISOString().substring(0, 10);
          break;
        }
        case 'month': {
          const year = dateAtParisMidnight.getUTCFullYear();
          const month = String(dateAtParisMidnight.getUTCMonth() + 1).padStart(
            2,
            '0',
          );
          label = `${year}-${month}`;
          break;
        }
        case 'year':
          label = String(dateAtParisMidnight.getUTCFullYear());
          break;
      }

      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label)!.push(entry.valeur);
    }

    return Array.from(grouped.entries()).map(([label, valeurs]) => {
      const sum = valeurs.reduce((a, b) => a + b, 0);
      return {
        label,
        moyenne: Number((sum / valeurs.length).toFixed(2)),
        min: Math.min(...valeurs),
        max: Math.max(...valeurs),
        count: valeurs.length,
      };
    });
  }
}
