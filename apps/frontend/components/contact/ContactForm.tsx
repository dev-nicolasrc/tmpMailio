"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

export function ContactForm() {
  const t = useTranslations("legal.contact")
  const subjects = t.raw("subjects") as string[]

  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email inválido"
    if (!subject) e.subject = "Selecciona un asunto"
    if (message.length < 20) e.message = "Mínimo 20 caracteres"
    return e
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    const sub = encodeURIComponent(`[TmpMail] ${subject}`)
    const body = encodeURIComponent(`De: ${email}\n\n${message}`)
    window.location.href = `mailto:contacto@tmpmailio.com?subject=${sub}&body=${body}`
  }

  const inputStyle = {
    width: "100%",
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-mid)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono), monospace",
    fontSize: "13px",
    padding: "10px 14px",
    outline: "none",
    boxSizing: "border-box" as const,
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Email */}
      <div>
        <label
          className="font-mono text-[10px] tracking-widest uppercase block mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("emailLabel")}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            ...inputStyle,
            borderColor: errors.email ? "var(--danger)" : "var(--border-mid)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
          onBlur={(e) => (e.target.style.borderColor = errors.email ? "var(--danger)" : "var(--border-mid)")}
        />
        {errors.email && (
          <span className="font-mono text-[11px] mt-1 block" style={{ color: "var(--danger)" }}>
            {errors.email}
          </span>
        )}
      </div>

      {/* Subject */}
      <div>
        <label
          className="font-mono text-[10px] tracking-widest uppercase block mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("subjectLabel")}
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          style={{
            ...inputStyle,
            borderColor: errors.subject ? "var(--danger)" : "var(--border-mid)",
            appearance: "none",
            cursor: "pointer",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
          onBlur={(e) => (e.target.style.borderColor = errors.subject ? "var(--danger)" : "var(--border-mid)")}
        >
          <option value="" disabled>—</option>
          {subjects.map((s, i) => (
            <option key={i} value={s}>{s}</option>
          ))}
        </select>
        {errors.subject && (
          <span className="font-mono text-[11px] mt-1 block" style={{ color: "var(--danger)" }}>
            {errors.subject}
          </span>
        )}
      </div>

      {/* Message */}
      <div>
        <label
          className="font-mono text-[10px] tracking-widest uppercase block mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("messageLabel")}
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder={t("messagePlaceholder")}
          style={{
            ...inputStyle,
            borderColor: errors.message ? "var(--danger)" : "var(--border-mid)",
            resize: "vertical",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
          onBlur={(e) => (e.target.style.borderColor = errors.message ? "var(--danger)" : "var(--border-mid)")}
        />
        {errors.message && (
          <span className="font-mono text-[11px] mt-1 block" style={{ color: "var(--danger)" }}>
            {errors.message}
          </span>
        )}
      </div>

      <button type="submit" className="btn-flat btn-accent self-start">
        {t("send")}
      </button>
    </form>
  )
}
