"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Copy, Check } from "lucide-react"
import { useClipboard } from "@/hooks/useClipboard"
import { useTranslations } from "next-intl"

interface CopyButtonProps {
  text: string
}

export function CopyButton({ text }: CopyButtonProps) {
  const t = useTranslations("hero")
  const { copy, copied } = useClipboard()

  return (
    <motion.button
      onClick={() => copy(text)}
      whileTap={{ scale: 0.95 }}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all
        ${copied
          ? "bg-success/20 text-success border border-success/40"
          : "bg-accent-primary text-white border border-accent-primary btn-glow"
        }
      `}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Check size={16} /> {t("copied")}
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Copy size={16} /> {t("copy")}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
