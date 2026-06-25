function calculateCompleteness(app: any): number {
  const total = 10;

  const criteria: boolean[] = [
    Boolean(app.shortName?.trim()),
    Boolean(app.description?.trim()),
    Array.isArray(app.tags) && app.tags.length > 0,
    Array.isArray(app.targetPopulations) && app.targetPopulations.length > 0,
    Array.isArray(app.purposes) && app.purposes.length > 0,
    Array.isArray(app.hostings) && app.hostings.length > 0,
    Boolean(app.priorityRestart),
    (app.relationsAsSource?.length ?? 0) > 0 || (app.relationsAsTarget?.length ?? 0) > 0,
    Array.isArray(app.externalRessource) && app.externalRessource.length > 0,
    Array.isArray(app.compliances) && app.compliances.length > 0,
  ];

  const score = criteria.reduce((acc, met) => acc + (met ? 1 : 0), 0);

  return Math.round((score / total) * 100);
}

export function useCompleteness() {
  function getCompletenessText(app: any): string {
    const score = calculateCompleteness(app);
    return `Complétude : ${score}%`;
  }

  return {
    calculateCompleteness,
    getCompletenessText,
  };
}
