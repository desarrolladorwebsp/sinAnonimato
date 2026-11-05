import { readFile } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../../src/lib/auth";
import { pool } from "../../src/lib/authorizations/db";

// Neon supplies a direct endpoint for schema changes; application traffic stays pooled.
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

async function main() {
  const db = pool(); const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(17415003)");
    for (const filename of ["001_authorizations.sql", "002_indefinite_retention.sql"]) {
      await client.query(await readFile(new URL(`../../migrations/${filename}`, import.meta.url), "utf8"));
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  const migrations = await getMigrations(getAuth().options);
  await migrations.runMigrations();
  console.log("Authorization and authentication schemas ready.");
}
main().catch(() => { console.error("Migration failed. Check configuration and database access; no credentials were logged."); process.exitCode = 1; }).finally(async () => { if (process.env.DATABASE_URL) await pool().end(); });
