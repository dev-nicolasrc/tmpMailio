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
      className="absolute top-full mt-2 left-0 z-20 card min-w-[180px] py-1 shadow-glow-accent"
    >
      {domains.map((d) => (
        <button
          key={d.domain}
          onClick={() => onSelect(d.domain)}
          className="w-full text-left px-4 py-2 text-sm text-text-secondary hover:text-accent-secondary hover:bg-bg-tertiary transition-colors font-mono"
        >
          @{d.label}
        </button>
      ))}
    </div>
  )
}
