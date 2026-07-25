import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = new Set<string>(["/"]);
// `/api/cron` has no session by design — it is called by a scheduler. The
// route handler authenticates with a shared secret and refuses to run when
// that secret is unset, so letting it past the session redirect here does not
// leave it open.
const PUBLIC_PREFIXES = ["/api/auth", "/api/cron", "/_next", "/favicon"];

const ROLE_PREFIXES: Record<string, string> = {
  "/admin": "ADMIN",
  "/teacher": "TEACHER",
  "/counselor": "COUNSELOR",
  "/principal": "PRINCIPAL",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const session = await auth();

  if (!session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (session.user.role !== requiredRole) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("forbidden", "1");
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
