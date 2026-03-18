"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="btn-flat"
      style={{ padding: "6px 12px", gap: "6px" }}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={13} /> : <Moon size={13} />}
      <span className="font-mono text-xs uppercase tracking-widest hidden sm:inline">
        {isDark ? "LIGHT" : "DARK"}
      </span>
    </button>
  )
}
