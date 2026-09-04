/**
 * Message d'erreur renvoyé par le backend (NestJS : `{ message: string | string[] }`),
 * ou `null` s'il n'y en a pas d'exploitable.
 *
 * Le client généré ne lève pas sur un 4xx/5xx : c'est `response.response.ok` qui fait foi,
 * et le message du backend (409 doublon, 400 saisie invalide, 403 périmètre) vaut mieux
 * qu'un texte générique — cf. #2512, où un 409 se soldait par un toast vert.
 */
export function backendErrorMessage(error: unknown): string | null {
  const message = (error as { message?: unknown } | null | undefined)?.message;
  if (Array.isArray(message)) {
    const parts = message.filter((part): part is string => typeof part === "string" && part.trim().length > 0);
    return parts.length ? parts.join(" ") : null;
  }
  return typeof message === "string" && message.trim() ? message : null;
}
