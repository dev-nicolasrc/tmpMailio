import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "TmpMail — Free Temporary Email / Correo Temporal Gratis"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#080808",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Background accent strips */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "#B8FF35", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "#B8FF35", display: "flex" }} />

        {/* Corner accents */}
        <div style={{ position: "absolute", top: 40, left: 40, width: 32, height: 32, borderTop: "2px solid #B8FF35", borderLeft: "2px solid #B8FF35", display: "flex" }} />
        <div style={{ position: "absolute", top: 40, right: 40, width: 32, height: 32, borderTop: "2px solid #B8FF35", borderRight: "2px solid #B8FF35", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 40, left: 40, width: 32, height: 32, borderBottom: "2px solid #B8FF35", borderLeft: "2px solid #B8FF35", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 40, right: 40, width: 32, height: 32, borderBottom: "2px solid #B8FF35", borderRight: "2px solid #B8FF35", display: "flex" }} />

        {/* System label */}
        <div
          style={{
            color: "#3A3A3A",
            fontSize: "13px",
            letterSpacing: "6px",
            textTransform: "uppercase",
            marginBottom: "32px",
            display: "flex",
          }}
        >
          // CORREO TEMPORAL · DISPOSABLE MAIL
        </div>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: "28px" }}>
          <span style={{ color: "#B8FF35", fontSize: "96px", fontWeight: 900, letterSpacing: "-4px", lineHeight: 1 }}>
            TMP
          </span>
          <span style={{ color: "#E8E4DC", fontSize: "96px", fontWeight: 900, letterSpacing: "-4px", lineHeight: 1 }}>
            MAIL
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            color: "#5A5A5A",
            fontSize: "20px",
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom: "48px",
            display: "flex",
          }}
        >
          Sin registro · Sin spam · Gratis
        </div>

        {/* Domain badge */}
        <div
          style={{
            border: "1px solid #B8FF35",
            color: "#B8FF35",
            padding: "10px 32px",
            fontSize: "18px",
            letterSpacing: "3px",
            display: "flex",
          }}
        >
          tmpmailio.com
        </div>
      </div>
    ),
    { ...size }
  )
}
