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
        "bg-primary":     "var(--bg-primary)",
        "bg-secondary":   "var(--bg-secondary)",
        "bg-tertiary":    "var(--bg-tertiary)",
        "accent-primary": "var(--accent-primary)",
        "accent-secondary":"var(--accent-secondary)",
        "text-primary":   "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        success:          "var(--success)",
        danger:           "var(--danger)",
      },
      fontFamily: {
        sans:    ["var(--font-space)", "sans-serif"],
        heading: ["var(--font-space)", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        "glow-accent": "0 0 20px rgba(108,99,255,0.4)",
        "glow-cyan":   "0 0 20px rgba(0,212,255,0.4)",
        "glow-success":"0 0 20px rgba(0,255,136,0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
}

export default config
