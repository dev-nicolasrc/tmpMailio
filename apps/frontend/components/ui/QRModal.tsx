"use client"

import { motion, AnimatePresence } from "framer-motion"
import { QRCodeSVG } from "qrcode.react"
import { X } from "lucide-react"

interface QRModalProps {
  address: string
  onClose: () => void
}

export function QRModal({ address, onClose }: QRModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="card p-8 flex flex-col items-center gap-4 relative"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-text-secondary hover:text-danger transition-colors"
          >
            <X size={20} />
          </button>
          <QRCodeSVG
            value={`mailto:${address}`}
            size={200}
            bgColor="transparent"
            fgColor="var(--accent-primary)"
            level="M"
          />
          <p className="font-mono text-sm text-accent-secondary text-center break-all max-w-[220px]">
            {address}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
