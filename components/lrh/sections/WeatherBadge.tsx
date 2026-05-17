'use client';

import React, { useEffect, useState } from 'react';

type Weather = { temperature: number; label: string; city: string };

/**
 * Badge météo léger pour les en-têtes. Fetch /api/weather côté client après
 * mount, fallback gracieux sur "Saint-Denis" simple si l'API échoue.
 */
export function WeatherBadge({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const [w, setW] = useState<Weather | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/weather')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setW(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (variant === 'mobile') {
    if (!w) return <>● Saint-Denis</>;
    return (
      <>
        ● {w.city} · {w.temperature}°C · {w.label}
      </>
    );
  }

  if (!w) return <span>● Saint-Denis</span>;
  return (
    <span>
      ● {w.city} · {w.temperature}°C · {w.label}
    </span>
  );
}
