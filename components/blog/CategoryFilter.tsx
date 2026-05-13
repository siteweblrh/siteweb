"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LRH, mono } from "@/components/lrh/tokens";
import { NEWS_CATEGORIES } from "@/lib/blog/categories";

export default function CategoryFilter({ active }: { active: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setCategory = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("c", value);
    else params.delete("c");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const baseChip: React.CSSProperties = {
    ...mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "8px 14px",
    borderRadius: 999,
    cursor: "pointer",
    border: "1px solid " + LRH.hairStrong,
    background: "#fff",
    color: LRH.navy,
    transition: "background 0.15s, color 0.15s, border-color 0.15s",
  };

  const activeStyle: React.CSSProperties = {
    background: LRH.navy,
    color: "#fff",
    borderColor: LRH.navy,
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button
        type="button"
        onClick={() => setCategory(null)}
        style={{ ...baseChip, ...(active === null ? activeStyle : {}) }}
      >
        Tous
      </button>
      {NEWS_CATEGORIES.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => setCategory(c.value)}
          style={{ ...baseChip, ...(active === c.value ? activeStyle : {}) }}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
