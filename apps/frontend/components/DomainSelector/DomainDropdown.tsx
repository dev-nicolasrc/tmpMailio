"use client"

import { useEffect, useState, useRef } from "react"

interface Domain { domain: string; label: string }

interface DomainDropdownProps {
  onSelect: (domain: string) => void
  onClose: () => void
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export function DomainDropdown({ onSelect, onClose }: DomainDropdownProps) {
  const [domains, setDomains] = useState<Domain[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API}/api/domains`)
      .then((r) => r.json())
      .then((data) => setDomains(data.domains ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1 left-0 z-20 py-1 min-w-[180px]"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-mid)",
        borderLeft: "2px solid var(--accent-primary)",
      }}
    >
      {domains.map((d) => (
        <button
          key={d.domain}
          onClick={() => onSelect(d.domain)}
          className="w-full text-left px-4 py-2.5 font-mono text-[12px] transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = "var(--accent-primary)"
            el.style.background = "var(--accent-dim)"
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = "var(--text-secondary)"
            el.style.background = "transparent"
          }}
        >
          @{d.label}
        </button>
      ))}
    </div>
  )
}
