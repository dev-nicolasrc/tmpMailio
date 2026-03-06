"use client"

import { useState } from "react"
import { RefreshCw, ChevronDown, QrCode, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { QRModal } from "@/components/ui/QRModal"
import { DomainDropdown } from "@/components/DomainSelector/DomainDropdown"

interface ToolbarProps {
  address: string
  onNew: () => void
  onDelete: () => void
  onDomainChange: (domain: string) => void
  isLoading: boolean
}

export function Toolbar({ address, onNew, onDelete, onDomainChange, isLoading }: ToolbarProps) {
  const t = useTranslations("hero")
  const [showQR, setShowQR] = useState(false)
  const [showDomains, setShowDomains] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <button
          onClick={onNew}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary border border-[var(--border)] text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-all btn-glow text-sm disabled:opacity-50"
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          {t("newEmail")}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDomains((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary border border-[var(--border)] text-text-secondary hover:text-accent-secondary hover:border-accent-secondary transition-all btn-glow-cyan text-sm"
          >
            <ChevronDown size={15} />
            {t("selectDomain")}
          </button>
          {showDomains && (
            <DomainDropdown
              onSelect={(domain) => { onDomainChange(domain); setShowDomains(false) }}
              onClose={() => setShowDomains(false)}
            />
          )}
        </div>

        <button
          onClick={() => setShowQR(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary border border-[var(--border)] text-text-secondary hover:text-accent-secondary hover:border-accent-secondary transition-all btn-glow-cyan text-sm"
        >
          <QrCode size={15} />
          {t("generateQR")}
        </button>

        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary border border-[var(--border)] text-text-secondary hover:text-danger hover:border-danger transition-all btn-glow-danger text-sm"
        >
          <Trash2 size={15} />
          {t("deleteMailbox")}
        </button>
      </div>

      {showQR && <QRModal address={address} onClose={() => setShowQR(false)} />}
    </>
  )
}
