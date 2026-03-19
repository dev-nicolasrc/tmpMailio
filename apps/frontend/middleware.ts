import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { locales, defaultLocale } from "./i18n"

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
})

function detectLocale(request: NextRequest): "es" | "en" {
  const acceptLang = request.headers.get("accept-language") ?? ""
  const primaryLang = acceptLang.split(",")[0].split(";")[0].trim().toLowerCase()
  return primaryLang.startsWith("es") ? "es" : "en"
}

// Bare paths that need locale-prefix but have no dynamic content
const BARE_PATHS = ["/privacy", "/terms", "/contact", "/about"]

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root and bare paths to the user's preferred locale.
  // Using 302 (temporary) so browsers re-detect on every fresh visit.
  if (pathname === "/" || BARE_PATHS.includes(pathname)) {
    const locale = detectLocale(request)
    return NextResponse.redirect(new URL(`/${locale}${pathname === "/" ? "" : pathname}`, request.url), 302)
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
