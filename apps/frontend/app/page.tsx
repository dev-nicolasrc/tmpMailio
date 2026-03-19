import { redirect } from "next/navigation"
import { headers } from "next/headers"

export default function RootPage() {
  const acceptLang = headers().get("accept-language") ?? ""
  const primaryLang = acceptLang.split(",")[0].split(";")[0].trim().toLowerCase()
  const locale = primaryLang.startsWith("es") ? "es" : "en"
  redirect(`/${locale}`)
}
