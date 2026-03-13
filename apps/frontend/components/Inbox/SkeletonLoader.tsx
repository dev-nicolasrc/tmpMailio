"use client"

import { useTranslations } from "next-intl"

export function SkeletonLoader() {
  const t = useTranslations("inbox")
  return (
    <div className="flex flex-col p-3 gap-2">
      <p className="text-xs text-text-secondary/50 text-center py-1">{t("empty")}</p>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-1.5 px-2 py-2.5 animate-pulse">
          <div className="flex justify-between">
            <div className="h-3 rounded bg-bg-tertiary w-2/5" />
            <div className="h-3 rounded bg-bg-tertiary w-1/6" />
          </div>
          <div className="h-3 rounded bg-bg-tertiary w-3/4" />
        </div>
      ))}
    </div>
  )
}
