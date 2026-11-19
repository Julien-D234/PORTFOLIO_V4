import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { localeCookie } from "@/i18n/config";
import { buildCsp } from "@/lib/csp";
import { localizedPath, localeFromPath, pickLocale } from "@/lib/locale";

export default function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const nonce = crypto.randomBytes(16).toString("base64url");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const existing = localeFromPath(pathname);
  const locale = existing ?? pickLocale(request.cookies.get(localeCookie)?.value, request.headers.get("accept-language"));
  requestHeaders.set("x-locale", locale);

  let response: NextResponse;
  if (!existing) {
    const url = request.nextUrl.clone();
    url.pathname = localizedPath(locale, pathname);
    response = NextResponse.redirect(url, 307);
    response.headers.set("Vary", "Accept-Language, Cookie");
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  response.headers.set("Content-Security-Policy", buildCsp(nonce, process.env.NODE_ENV !== "production"));
  return response;
}

export const config = {
  matcher: ["/((?!api|media/|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
