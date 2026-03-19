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
        // Prevent browsers and CDNs from caching HTML pages.
        // _next/static/ assets use content-based hashes so they can stay immutable.
        source: "/((?!_next/static|_next/image|favicon.ico|icons|sounds|manifest.json).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ]
  },
}

module.exports = withBundleAnalyzer(withNextIntl(nextConfig))
