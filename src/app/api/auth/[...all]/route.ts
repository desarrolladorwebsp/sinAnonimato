import { getAuth } from "@/lib/auth";
import { AuthorizationError } from "@/lib/authorizations/config";
import { body, privateHeaders, sameOrigin } from "@/lib/authorizations/http";

export const runtime = "nodejs";
async function handler(request: Request) {
  try {
    if (request.method === "POST") {
      sameOrigin(request);
      const input = await body(request, 8192);
      const headers = new Headers(request.headers);
      headers.delete("content-length");
      request = new Request(request.url, { method: "POST", headers, body: JSON.stringify(input) });
    }
    return await getAuth().handler(request);
  }
  catch (error) {
    return Response.json({ message: error instanceof AuthorizationError ? error.message : "No se pudo iniciar sesión. Inténtalo nuevamente." }, { status: error instanceof AuthorizationError ? error.status : 500, headers: privateHeaders });
  }
}
export const GET = handler;
export const POST = handler;
