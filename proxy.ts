import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = new Set<string>(["/"]);
// `/api/cron` has no session by design — it is called by a scheduler. The
// route handler authenticates with a shared secret and refuses to run when
// that secret is unset, so letting it past the session redirect here does not
// leave it open.
// `/api/health` is a liveness probe for Docker/Dokploy, which has no session to
// present. It returns a bare ok/not-ok — no data to protect.
const PUBLIC_PREFIXES = ["/api/auth", "/api/cron", "/api/health", "/_next", "/favicon"];

const CHANGE_PASSWORD_PATH = "/change-password";

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

  // Allow static files in the public directory to be accessed without authentication
  if (/\.(?:png|jpg|jpeg|gif|svg|ico|webp)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // An admin-minted password (staff import, Admin -> Users reset) is a
  // credential the user never chose. Funnel every route to the change screen
  // until they pick their own; the role checks below still apply afterwards.
  if (session.user.mustChangePassword) {
    if (pathname !== CHANGE_PASSWORD_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = CHANGE_PASSWORD_PATH;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
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
