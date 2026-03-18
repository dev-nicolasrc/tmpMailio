import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { locales, defaultLocale } from "./i18n"

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
})

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root to /en with 301 permanent before next-intl runs.
  // next-intl's createMiddleware uses a cookie-based 307 (temporary) by default,
  // which does not transfer link equity. This intercept forces a permanent redirect.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/en", request.url), 301)
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
