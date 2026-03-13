import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "bg-primary":      "var(--bg-primary)",
        "bg-secondary":    "var(--bg-secondary)",
        "bg-tertiary":     "var(--bg-tertiary)",
        "accent-primary":  "var(--accent-primary)",
        "accent-secondary":"var(--accent-secondary)",
        "text-primary":    "var(--text-primary)",
        "text-secondary":  "var(--text-secondary)",
        success:           "var(--success)",
        danger:            "var(--danger)",
        border:            "var(--border)",
        "border-mid":      "var(--border-mid)",
      },
      fontFamily: {
        sans:    ["var(--font-mono)", "Fira Code", "monospace"],
        heading: ["var(--font-display)", "Syne", "sans-serif"],
        display: ["var(--font-display)", "Syne", "sans-serif"],
        mono:    ["var(--font-mono)", "Fira Code", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        full: "9999px",
      },
      boxShadow: {
        "glow-accent": "0 0 24px rgba(184,255,53,0.25)",
        "glow-danger": "0 0 24px rgba(255,51,51,0.25)",
      },
      animation: {
        "fade-up":     "fadeUp 0.45s ease-out",
        "slide-right": "slideRight 0.3s ease-out",
        "pulse-slow":  "pulse 2.5s cubic-bezier(0.4,0,0.6,1) infinite",
        "spin-slow":   "spin 2s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
}

export default config
