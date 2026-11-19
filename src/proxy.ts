import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, PROTECTED_PREFIX, ROUTES } from "@/constants/routes";
import { STORAGE_KEYS } from "@/constants/storage";

// /**
//  * Edge route protection (Next 16 `proxy` convention, formerly `middleware`):
//  *  - root `/`                           -> login (no session) or dashboard (session):
//  *                                          the doctor portal opens on login, not a landing page
//  *  - no session on a /dashboard route  -> redirect to /login?redirect=<path>
//  *  - session present on an auth route   -> redirect to /dashboard
//  *  - otherwise                          -> continue to the route (NextResponse.next)
//  *
//  * Presence check only (fast, edge-safe). A refresh token alone counts as a
//  * session: the client bootstrap rotates it into a fresh pair via
//  * /auth/refresh, and the backend's `authenticate` middleware remains the real
//  * authority on every API call.
//  */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasSession =
    Boolean(request.cookies.get(STORAGE_KEYS.accessToken)?.value) ||
    Boolean(request.cookies.get(STORAGE_KEYS.refreshToken)?.value);

  // The doctor app has no public landing page — the root opens straight on the
  // login screen (or the dashboard when already signed in).
  if (pathname === ROUTES.home) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = hasSession ? ROUTES.dashboard.root : ROUTES.auth.login;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  const isProtected = pathname === PROTECTED_PREFIX || pathname.startsWith(`${PROTECTED_PREFIX}/`);
  const isAuthPage = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (isProtected && !hasSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROUTES.auth.login;
    redirectUrl.search = "";
    redirectUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPage && hasSession) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROUTES.dashboard.root;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\.).*)"],
};
