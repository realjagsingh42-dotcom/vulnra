"use client";

interface VulnraLogoProps {
  size?: "sm" | "md";
  suffix?: string; // e.g. "PLATFORM", "SETTINGS", "ANALYTICS"
}

export default function VulnraLogo({ size = "md", suffix }: VulnraLogoProps) {
  const box = size === "sm" ? 24 : 28;
  const icon = size === "sm" ? 12 : 14;

  return (
    <span className="flex items-center gap-2">
      <span
        style={{
          width: box,
          height: box,
          borderRadius: 5,
          background: "#060608",
          border: "1.5px solid #b8ff57",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          animation: "neonBoxPulse 2s ease-in-out infinite",
        }}
      >
        <svg width={icon} height={icon} viewBox="0 0 20 20" fill="none">
          <rect x="1" y="1" width="7.5" height="7.5" rx=".8" fill="#b8ff57"
            style={{ animation: "neonSqSeq 2.4s ease-in-out infinite 0s" }} />
          <rect x="11.5" y="1" width="7.5" height="7.5" rx=".8" fill="#b8ff57"
            style={{ animation: "neonSqSeq 2.4s ease-in-out infinite 0.3s" }} />
          <rect x="1" y="11.5" width="7.5" height="7.5" rx=".8" fill="#b8ff57"
            style={{ animation: "neonSqSeq 2.4s ease-in-out infinite 0.6s" }} />
          <rect x="11.5" y="11.5" width="7.5" height="7.5" rx=".8" fill="#b8ff57"
            style={{ animation: "neonSqSeq 2.4s ease-in-out infinite 0.9s" }} />
          <circle cx="14.25" cy="16.75" r="1.1" fill="#b8ff57"
            style={{ animation: "neonDotPulse 1.2s ease-in-out infinite 0s" }} />
          <circle cx="17.25" cy="16.75" r="1.1" fill="#b8ff57"
            style={{ animation: "neonDotPulse 1.2s ease-in-out infinite 0.5s" }} />
        </svg>
      </span>
      <span className="font-mono text-sm font-bold tracking-wider">
        VULN<span style={{ color: "#b8ff57" }}>RA</span>
        {suffix && (
          <em className="not-italic tracking-tighter ml-1" style={{ color: "#b8ff57" }}>
            {suffix}
          </em>
        )}
      </span>
    </span>
  );
}
