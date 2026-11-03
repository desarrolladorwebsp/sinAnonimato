import { getAuth } from "@/lib/auth";
import { AuthorizationError } from "@/lib/authorizations/config";
import { sameOrigin } from "@/lib/authorizations/http";

export const runtime = "nodejs";
async function handler(request: Request) {
  try { if (request.method === "POST") sameOrigin(request); return await getAuth().handler(request); }
  catch (error) {
    return Response.json({ message: error instanceof AuthorizationError ? error.message : "No se pudo iniciar sesión. Inténtalo nuevamente." }, { status: error instanceof AuthorizationError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
export const GET = handler;
export const POST = handler;
