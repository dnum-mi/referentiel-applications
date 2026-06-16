import { Client } from "pg";

/**
 * Accès direct à la base applicative pour le provisioning hors API (ex. `eco_index_score`, qui n'est
 * pas un champ inscriptible côté API et n'est posé que par un scan HTTP réel). À réserver aux cas où
 * l'API ne permet pas d'établir l'état de départ d'un protocole.
 */
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:password@localhost:5432/postgres";

/** Exécute une requête SQL paramétrée sur une connexion éphémère. */
export async function dbQuery<T = unknown>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(text, params);
    return res.rows as T[];
  } finally {
    await client.end();
  }
}
