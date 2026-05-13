import React from "react";
import Link from "next/link";
import { LRH, mono } from "@/components/lrh/tokens";

type Variant = "navy" | "paper";

export default function BackToHome({
  variant = "navy",
  label = "Retour à l'accueil",
  style,
}: {
  variant?: Variant;
  label?: string;
  style?: React.CSSProperties;
}) {
  const isNavy = variant === "navy";
  return (
    <Link
      href="/"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 999,
        background: isNavy ? "rgba(255,255,255,0.08)" : "#fff",
        border: "1px solid " + (isNavy ? "rgba(255,255,255,0.18)" : LRH.hairStrong),
        color: isNavy ? "#fff" : LRH.navy,
        textDecoration: "none",
        ...mono,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        transition: "background 0.15s, border-color 0.15s",
        ...style,
      }}
    >
      <span aria-hidden style={{ fontSize: 13 }}>←</span>
      {label}
    </Link>
  );
}
