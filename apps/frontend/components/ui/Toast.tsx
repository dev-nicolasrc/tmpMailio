"use client"

interface ToastProps {
  message: string
}

export function Toast({ message }: ToastProps) {
  return (
    <div
      className="animate-slide-right"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 50,
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-mid)",
        borderLeft: "3px solid var(--accent-primary)",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: "6px",
          height: "6px",
          background: "var(--accent-primary)",
          flexShrink: 0,
        }}
      />
      <span
        className="font-mono text-xs"
        style={{ color: "var(--text-primary)" }}
      >
        {message}
      </span>
    </div>
  )
}
