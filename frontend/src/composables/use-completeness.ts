export function useCompleteness() {
  function calculateCompleteness(app: any): number {
    let score = 0;
    const total = 10;

    if (app.shortName?.trim()) score++;
    if (app.description?.trim()) score++;
    if (Array.isArray(app.tags) && app.tags.length > 0) score++;
    if (Array.isArray(app.targetPopulations) && app.targetPopulations.length > 0) score++;
    if (Array.isArray(app.purposes) && app.purposes.length > 0) score++;
    if (Array.isArray(app.hostings) && app.hostings.length > 0) score++;
    if (app.priorityRestart) score++;
    if ((app.relationsAsSource?.length ?? 0) > 0 || (app.relationsAsTarget?.length ?? 0) > 0) score++;
    if (Array.isArray(app.externalRessource) && app.externalRessource.length > 0) score++;
    if (Array.isArray(app.compliances) && app.compliances.length > 0) score++;

    return Math.round((score / total) * 100);
  }

  function getCompletenessText(app: any): string {
    const score = calculateCompleteness(app);
    return `Complétude : ${score}%`;
  }

  return {
    calculateCompleteness,
    getCompletenessText,
  };
}
