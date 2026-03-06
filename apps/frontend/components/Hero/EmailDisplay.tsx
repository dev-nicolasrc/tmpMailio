"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface EmailDisplayProps {
  address: string
}

export function EmailDisplay({ address }: EmailDisplayProps) {
  const [displayed, setDisplayed] = useState("")

  useEffect(() => {
    setDisplayed("")
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(address.slice(0, i + 1))
      i++
      if (i >= address.length) clearInterval(interval)
    }, 30)
    return () => clearInterval(interval)
  }, [address])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="relative flex items-center w-full bg-bg-secondary border border-[var(--border)] rounded-xl px-5 py-4 focus-within:border-accent-primary transition-colors">
        <span className="font-mono text-lg md:text-xl text-accent-secondary flex-1 truncate min-w-0">
          {displayed}
          <span className="animate-pulse">|</span>
        </span>
      </div>
    </motion.div>
  )
}
