const createNextIntlPlugin = require("next-intl/plugin")
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

const withNextIntl = createNextIntlPlugin("./i18n.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@tmpmail/shared"],
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Bare-path locale redirects (/privacy, /terms, etc.) are handled by middleware
  // with language detection — removed hardcoded /en redirects from here.
  async headers() {
    return [
      {
        // Static assets: immutable cache (content-hashed filenames)
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Static pages (about, privacy, terms, contact, use-case slugs)
        // SSG — safe to cache 1h, revalidate in background
        source: "/:locale(es|en)/:path+",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        // Main mailbox pages — SSR but cacheable at edge
        source: "/:locale(es|en)",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        // Public assets (icons, manifest, favicon)
        source: "/:file(favicon.ico|icon.png|apple-touch-icon.png|manifest.json|manifest.en.json|manifest.es.json)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ]
  },
}

module.exports = withBundleAnalyzer(withNextIntl(nextConfig))
