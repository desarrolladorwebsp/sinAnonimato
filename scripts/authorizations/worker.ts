import { database, pool } from "../../src/lib/authorizations/db";
import { processOutbox } from "../../src/lib/authorizations/mail";

processOutbox(database(), undefined, 50).then(result => console.log(`Authorization mail jobs processed: ${result.processed}`)).catch(() => { console.error("Authorization worker failed."); process.exitCode = 1; }).finally(async () => { await pool().end(); });
