/** Une erreur de transport ou de décodage peut accompagner un statut HTTP réussi. */
export function isApiSuccess(result: { response?: Pick<Response, "ok">; error?: unknown }): boolean {
  return result.response?.ok === true && result.error === undefined;
}
