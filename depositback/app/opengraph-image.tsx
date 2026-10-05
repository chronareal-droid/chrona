import { ImageResponse } from "next/og";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

export const alt = APP_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {/* Logo mark — accent square with a house and check mark */}
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#0b8f52" />
            <path d="M12 5L5.5 10.5V18.5H18.5V10.5L12 5Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M9.25 13.75L11.25 15.75L14.75 12" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 56, fontWeight: 700, color: "#fafafa" }}>
            {APP_NAME}
          </span>
        </div>
        <span
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            maxWidth: "600px",
            textAlign: "center",
          }}
        >
          {APP_DESCRIPTION}
        </span>
      </div>
    ),
    { ...size }
  );
}
