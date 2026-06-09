import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /login (login page - auth not needed)
     * - / (root page - handles its own redirect logic)
     */
    "/((?!_next/static|_next/image|favicon.ico|login|$).*)",
  ],
};
