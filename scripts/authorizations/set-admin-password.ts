import { getAuth } from "../../src/lib/auth";
import { adminRole } from "../../src/lib/authorizations/config";
import { pool } from "../../src/lib/authorizations/db";

// Operator-only script. Supply the password on stdin, never in arguments or Git.
let stage = "input";
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || adminRole(email) !== "admin" || process.stdin.isTTY) throw new Error("Invalid provisioning request");
  let password = "";
  for await (const chunk of process.stdin) {
    password += chunk.toString();
    if (password.length > 130) throw new Error("Password too long");
  }
  password = password.replace(/\r?\n$/, "");
  if (password.length < 12 || password.length > 128) throw new Error("Invalid password length");
  stage = "context";
  const context = await getAuth().$context;
  stage = "hash";
  const hash = await context.password.hash(password);
  password = "";
  const adapter = context.internalAdapter;
  stage = "lookup";
  const existing = await adapter.findUserByEmail(email, { includeAccounts: true });
  stage = "user";
  const user = existing?.user ?? await adapter.createUser({ email, name: "Equipo Sin Anonimato", emailVerified: true }, { method: "email-password" });
  stage = "credential";
  if (existing?.accounts.some(account => account.providerId === "credential" && account.accountId === user.id)) {
    await adapter.updatePassword(user.id, hash);
  } else {
    await adapter.linkAccount({ userId: user.id, accountId: user.id, providerId: "credential", password: hash });
  }
  stage = "verification";
  if (!user.emailVerified) await adapter.updateUser(user.id, { emailVerified: true });
  stage = "sessions";
  await adapter.deleteUserSessions(user.id);
  console.log("Administrator password stored with the authentication library hash; previous sessions revoked.");
}
main().catch((error: unknown) => { const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown"; console.error("Could not provision administrator access. No credentials were logged.", stage, error instanceof Error ? error.name : "Error", /^[A-Z0-9_]{1,40}$/.test(code) ? code : "unknown"); process.exitCode = 1; }).finally(async () => { if (process.env.DATABASE_URL) await pool().end(); });
