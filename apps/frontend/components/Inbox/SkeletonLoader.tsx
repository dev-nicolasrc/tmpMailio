import { useTranslations } from "next-intl"

export function SkeletonLoader() {
  const t = useTranslations("inbox")
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center text-text-secondary text-sm py-2">{t("empty")}</p>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-4 flex flex-col gap-2 animate-pulse">
          <div className="h-3 rounded bg-bg-tertiary w-1/3" />
          <div className="h-4 rounded bg-bg-tertiary w-2/3" />
          <div className="h-3 rounded bg-bg-tertiary w-1/4" />
        </div>
      ))}
      <p className="text-center text-text-secondary text-xs mt-1">{t("emptyHint")}</p>
    </div>
  )
}
