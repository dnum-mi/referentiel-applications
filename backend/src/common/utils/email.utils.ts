import { Prisma } from "@prisma/client";

/**
 * #2501 — L'e-mail du SSO arrive brut, celui des acteurs est saisi à la main : rien ne les
 * normalisait, et un acteur déclaré « Jean.Dupont@… » ne recevait aucun droit, sans message.
 * Règle unique : on ÉCRIT en minuscules (utilisateur, acteur) et on COMPARE sans tenir compte
 * de la casse (ceinture et bretelles pour les lignes antérieures à la migration de rattrapage
 * et les données injectées hors API).
 */
export function normalizeEmail<T extends string | null | undefined>(
  email: T,
): T {
  return (typeof email === "string" ? email.trim().toLowerCase() : email) as T;
}

/** Clause Prisma « e-mail égal, insensible à la casse ». */
export function emailEquals(email: string): Prisma.StringFilter {
  return { equals: email, mode: "insensitive" };
}

/**
 * Clause Prisma « e-mail parmi cette liste », insensible à la casse (`in` est strict).
 * Liste vide → clause impossible à satisfaire, comme `in: []`.
 */
export function emailIn(emails: string[]): Prisma.UserWhereInput {
  const distinct = [...new Set(emails.map(normalizeEmail))];
  if (distinct.length === 0) return { id: { in: [] } };
  return { OR: distinct.map((email) => ({ email: emailEquals(email) })) };
}
