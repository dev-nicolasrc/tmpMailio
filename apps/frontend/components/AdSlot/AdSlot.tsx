"use client"

import { useEffect, useRef } from "react"

interface AdSlotProps {
  size: "728x90" | "300x250" | "320x100" | "320x50"
  className?: string
}

const SIZES: Record<AdSlotProps["size"], { w: number; h: number }> = {
  "728x90":  { w: 728, h: 90 },
  "300x250": { w: 300, h: 250 },
  "320x100": { w: 320, h: 100 },
  "320x50":  { w: 320, h: 50 },
}

export function AdSlot({ size, className = "" }: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { w, h } = SIZES[size]

  useEffect(() => {
    // Ad network initialization hook — replace with your network's script call
    // e.g.: (window as any).adNetwork?.push({ slot: ref.current })
  }, [])

  return (
    <div
      ref={ref}
      className={`flex items-center justify-center bg-bg-secondary border border-[var(--border)] rounded-lg overflow-hidden ${className}`}
      style={{ width: w, height: h, maxWidth: "100%" }}
      aria-label="Advertisement"
    >
      {/* Ad network renders here */}
      <span className="text-xs text-text-secondary/40 select-none">Ad {size}</span>
    </div>
  )
}
