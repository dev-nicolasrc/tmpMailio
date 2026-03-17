import { ImageResponse } from "next/og"

export const runtime = "edge"

export function GET() {
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
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "#B8FF35",
            display: "flex",
          }}
        />
        <span
          style={{
            color: "#B8FF35",
            fontSize: "80px",
            fontWeight: 900,
            letterSpacing: "-4px",
            lineHeight: 1,
            display: "flex",
          }}
        >
          TMP
        </span>
      </div>
    ),
    { width: 192, height: 192 }
  )
}
