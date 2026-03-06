// Domains are loaded from the DOMAINS env var at runtime.
// This file provides the type and a helper to parse them.

export interface DomainConfig {
  domain: string
  label: string
}

export function parseDomainsFromEnv(env: string | undefined): DomainConfig[] {
  if (!env) return []
  return env.split(",").map((d) => ({
    domain: d.trim(),
    label: d.trim(),
  }))
}
