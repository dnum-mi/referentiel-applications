import { Client } from "pg";

/**
 * Transforme une URL de base de données PostgreSQL pour ajouter le préfixe 'test_' au nom de la base.
 * Exemple: postgresql://user:pass@host:5432/mydb -> postgresql://user:pass@host:5432/test_mydb
 */
export function getTestDatabaseUrl(originalUrl: string): string {
  const url = new URL(originalUrl);
  const dbName = url.pathname.slice(1); // Enlève le '/' initial
  const testDbName = `test_${dbName}`;
  url.pathname = `/${testDbName}`;
  return url.toString();
}

/**
 * Crée la base de données de test si elle n'existe pas déjà
 */
export async function createTestDatabase(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const testDbName = url.pathname.slice(1);

  // Se connecter à la base par défaut (postgres) pour créer la base de test
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  const client = new Client({ connectionString: adminUrl.toString() });

  try {
    await client.connect();

    // Vérifier si la base existe déjà
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [testDbName],
    );

    if (result.rowCount === 0) {
      // Créer la base de test
      await client.query(`CREATE DATABASE "${testDbName}"`);
      console.log(`✅ Test database '${testDbName}' created`);
    } else {
      console.log(`ℹ️  Test database '${testDbName}' already exists`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Supprime la base de données de test
 */
export async function dropTestDatabase(databaseUrl: string): Promise<void> {
  const url = new URL(databaseUrl);
  const testDbName = url.pathname.slice(1);

  // Se connecter à la base par défaut (postgres) pour supprimer la base de test
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  const client = new Client({ connectionString: adminUrl.toString() });

  try {
    await client.connect();

    // Forcer la déconnexion de tous les utilisateurs
    await client.query(
      `
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid()
    `,
      [testDbName],
    );

    // Supprimer la base de test
    await client.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
    console.log(`🗑️ Test database '${testDbName}' dropped`);
  } finally {
    await client.end();
  }
}

/**
 * Nettoie toutes les données de la base de test (alternative à la suppression complète)
 */
export async function cleanTestDatabase(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    // Récupérer toutes les tables
    const result = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
        AND tablename != '_prisma_migrations'
    `);

    // Supprimer toutes les données
    for (const row of result.rows) {
      await client.query(`TRUNCATE TABLE "${row.tablename}" CASCADE`);
    }

    console.log("🧹 Base de données de test nettoyée");
  } finally {
    await client.end();
  }
}
