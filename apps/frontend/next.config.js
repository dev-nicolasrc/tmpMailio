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
  async redirects() {
    return [
      // Redirect bare /privacy and /terms to locale-prefixed versions (301 permanent)
      { source: "/privacy", destination: "/en/privacy", permanent: true },
      { source: "/terms", destination: "/en/terms", permanent: true },
      { source: "/contact", destination: "/en/contact", permanent: true },
      { source: "/about", destination: "/en/about", permanent: true },
    ]
  },
}

module.exports = withBundleAnalyzer(withNextIntl(nextConfig))
