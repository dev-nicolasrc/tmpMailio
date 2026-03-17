const createNextIntlPlugin = require("next-intl/plugin")
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

const withNextIntl = createNextIntlPlugin("./i18n.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@tmpmail/shared"],
}

module.exports = withBundleAnalyzer(withNextIntl(nextConfig))
