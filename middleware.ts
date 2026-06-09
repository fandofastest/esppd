import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(/\.(.*)$/)
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const hasSession = Boolean(request.cookies.get("esppd_session")?.value);

  if (!isPublicPath && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicPath && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};
