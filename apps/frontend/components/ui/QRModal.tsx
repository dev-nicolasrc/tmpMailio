"use client"

import { QRCodeSVG } from "qrcode.react"
import { X } from "lucide-react"

interface QRModalProps {
  address: string
  onClose: () => void
}

export function QRModal({ address, onClose }: QRModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-modal-backdrop"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center gap-5 relative p-8 animate-modal-panel"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-mid)",
          borderLeft: "3px solid var(--accent-primary)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 btn-flat"
          style={{ padding: "4px 6px" }}
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>

        <span
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: "var(--text-secondary)" }}
        >
          // qr code
        </span>

        <div
          className="p-4"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
        >
          <QRCodeSVG
            value={`mailto:${address}`}
            size={180}
            bgColor="transparent"
            fgColor="var(--accent-primary)"
            level="M"
          />
        </div>

        <p
          className="font-mono text-xs text-center break-all max-w-[220px]"
          style={{ color: "var(--accent-primary)" }}
        >
          {address}
        </p>
      </div>
    </div>
  )
}
