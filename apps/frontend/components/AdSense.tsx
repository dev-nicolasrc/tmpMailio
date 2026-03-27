"use client"

import { useEffect } from "react"

export function AdSense() {
  useEffect(() => {
    function load() {
      if (document.querySelector('script[src*="adsbygoogle"]')) return
      const s = document.createElement("script")
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2594577923637858"
      s.crossOrigin = "anonymous"
      s.async = true
      document.body.appendChild(s)
    }

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(load, { timeout: 3000 })
      return () => cancelIdleCallback(id)
    } else {
      const timer = setTimeout(load, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  return null
}
