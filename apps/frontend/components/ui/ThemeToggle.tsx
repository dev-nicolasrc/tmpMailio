"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg bg-bg-secondary border border-[var(--border)] text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-all btn-glow"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
