'use client';

import React, { useEffect, useRef, useState } from 'react';

type WeatherCity = {
  city: string;
  temperature: number;
  code: number | null;
  label: string;
  matchDay: boolean;
};

const ROTATE_MS = 6000;

/**
 * Badge météo des en-têtes. Récupère /api/weather (météo de toutes les villes
 * de clubs en un appel) puis fait défiler les villes en boucle, avec un léger
 * fondu. Les jours de match, l'API ne renvoie que les lieux de match : le
 * badge se concentre alors dessus et l'indique (drapeau). Fallback gracieux
 * « Saint-Denis » si l'API échoue.
 */
export function WeatherBadge({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const [cities, setCities] = useState<WeatherCity[] | null>(null);
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let alive = true;
    fetch('/api/weather')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.cities) && d.cities.length > 0) {
          setCities(d.cities);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Rotation : avance d'une ville toutes les ROTATE_MS, avec un bref fondu.
  useEffect(() => {
    if (!cities || cities.length < 2) return;
    const id = setInterval(() => {
      if (reduceMotion.current) {
        setI((n) => (n + 1) % cities.length);
        return;
      }
      setVisible(false);
      window.setTimeout(() => {
        setI((n) => (n + 1) % cities.length);
        setVisible(true);
      }, 300);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [cities]);

  if (!cities) {
    return variant === 'mobile' ? <>● Saint-Denis</> : <span>● Saint-Denis</span>;
  }

  const w = cities[i % cities.length];
  const content = (
    <>
      ● {w.city} · {w.temperature}°C · {w.label}
      {w.matchDay ? <> · ⚑ Jour de match</> : null}
    </>
  );

  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.3s ease',
  };

  return <span style={style}>{content}</span>;
}
