import { Pool } from "pg";
import { AuthorizationError } from "./config";

export interface Connection {
  query<T extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: T[]; rowCount?: number | null }>;
}
export interface Database extends Connection {
  transaction<T>(work: (connection: Connection) => Promise<T>): Promise<T>;
}
const globalDb = globalThis as unknown as { authorizationPool?: Pool };
export function pool() {
  if (!process.env.DATABASE_URL) throw new AuthorizationError(503, "Falta conectar la base de datos de autorizaciones.");
  return globalDb.authorizationPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 });
}
export function database(): Database {
  return {
    query: (sql, values) => pool().query(sql, values),
    async transaction(work) {
      const client = await pool().connect();
      try { await client.query("BEGIN"); const result = await work(client); await client.query("COMMIT"); return result; }
      catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    },
  };
}
