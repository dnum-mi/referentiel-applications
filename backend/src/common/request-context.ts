import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContextStore {
  /// Administrateur réel quand la requête est faite sous impersonation.
  impersonatorId?: string;
}

/**
 * Contexte propagé sur toute la durée d'une requête HTTP (#2226), posé par
 * RequestContextMiddleware. Permet aux couches basses (ex. extensions Prisma)
 * de lire des informations de la requête sans les threader dans chaque appel.
 */
export const requestContext = new AsyncLocalStorage<RequestContextStore>();
