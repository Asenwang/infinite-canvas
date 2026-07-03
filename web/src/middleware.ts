import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/canvas", "/image", "/assets"];
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "infinite_canvas_session";

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;
    if (!PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return NextResponse.next();
    if (request.cookies.get(AUTH_COOKIE_NAME)?.value) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
}

export const config = {
    matcher: ["/canvas/:path*", "/image/:path*", "/assets/:path*"],
};
