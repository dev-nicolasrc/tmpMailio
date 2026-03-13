"use client"

import { useTranslations } from "next-intl"

export function SkeletonLoader() {
  const t = useTranslations("inbox")
  return (
    <div className="flex flex-col p-4 gap-2">
      <p
        className="font-mono text-[10px] text-center py-1 uppercase tracking-widest"
        style={{ color: "var(--text-secondary)", opacity: 0.5 }}
      >
        {t("empty")}
      </p>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-1.5 px-2 py-3 animate-pulse">
          <div className="flex justify-between gap-2">
            <div className="h-2.5 w-2/5" style={{ background: "var(--bg-tertiary)" }} />
            <div className="h-2.5 w-1/6" style={{ background: "var(--bg-tertiary)" }} />
          </div>
          <div className="h-2.5 w-3/4" style={{ background: "var(--bg-tertiary)" }} />
        </div>
      ))}
    </div>
  )
}
