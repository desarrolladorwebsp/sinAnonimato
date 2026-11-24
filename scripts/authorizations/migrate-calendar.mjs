import { readFile } from "node:fs/promises";
import pg from "pg";

const migrationFiles = [
  "005_episode_schedule.sql",
  "006_episode_formats.sql",
  "007_calendar_management.sql",
];

async function migrate() {
  const environment = process.env.VERCEL_ENV;
  if (!environment) throw new Error("Vercel environment is required.");
  if (environment !== "production") return;

  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Production database connection is required.");

  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 10000 });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SELECT pg_advisory_xact_lock(17415003)");
    const { rows: [schema] } = await client.query(`
      SELECT
        (SELECT count(*) = 4 FROM information_schema.columns
         WHERE table_schema = current_schema()
           AND ((table_name = 'sa_episode_schedule' AND column_name IN ('format', 'removed_at', 'updated_by'))
             OR (table_name = 'sa_authorizations' AND column_name = 'invitation_key')))
        AND to_regclass('sa_active_invitation_key') IS NOT NULL AS ready
    `);
    if (!schema.ready) {
      for (const filename of migrationFiles) {
        const sql = await readFile(new URL(`../../migrations/${filename}`, import.meta.url), "utf8");
        await client.query(sql);
      }
    }
    await client.query("COMMIT");
    console.log("Production calendar schema is ready.");
  } finally {
    // PostgreSQL rolls back any uncommitted changes when the connection closes.
    await client.end();
  }
}

try {
  await migrate();
} catch (error) {
  const code = typeof error.code === "string" && /^[A-Z0-9_]{2,30}$/.test(error.code)
    ? ` (${error.code})`
    : "";
  console.error(`Calendar migration failed${code}. Check the Vercel environment and database configuration.`);
  process.exitCode = 1;
}
