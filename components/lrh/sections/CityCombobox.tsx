'use client';

import React, { useMemo, useRef, useState } from 'react';
import { LRH, mono, body, display } from '../tokens';
import { CITIES_DIRECTORY } from '@/lib/reunionCityCoords';
import { nearestCity, type LatLon } from '@/lib/utils/distance';

export type CityChoice = {
  slug: string;
  label: string;
  lat: number;
  lon: number;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Champ ville avec autocomplete sur les communes de La Réunion + bouton
 * « Me localiser » (navigator.geolocation). À chaque sélection, appelle
 * onChange(choice).
 */
export function CityCombobox({
  value,
  onChange,
  placeholder = 'Saisissez votre commune…',
}: {
  value: CityChoice | null;
  onChange: (choice: CityChoice | null) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState(value?.label ?? '');
  const [open, setOpen] = useState(false);
  const [geolocStatus, setGeolocStatus] = useState<'idle' | 'loading' | 'denied' | 'error'>('idle');
  const wrapRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setInput(value?.label ?? '');
  }, [value?.slug]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const suggestions = useMemo(() => {
    const n = normalize(input);
    if (!n) return CITIES_DIRECTORY.slice(0, 8);
    return CITIES_DIRECTORY.filter((c) => normalize(c.label).includes(n)).slice(0, 10);
  }, [input]);

  const selectCity = (c: CityChoice) => {
    setInput(c.label);
    setOpen(false);
    onChange(c);
  };

  const handleGeoloc = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeolocStatus('error');
      return;
    }
    setGeolocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll: LatLon = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        const best = nearestCity(ll, CITIES_DIRECTORY);
        if (!best) {
          setGeolocStatus('error');
          return;
        }
        const found = CITIES_DIRECTORY.find((c) => c.slug === best.slug);
        if (found) {
          setGeolocStatus('idle');
          selectCity(found);
        } else {
          setGeolocStatus('error');
        }
      },
      (err) => {
        setGeolocStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <input
            type="text"
            value={input}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
              if (e.target.value === '') onChange(null);
            }}
            placeholder={placeholder}
            style={{
              ...body,
              fontSize: 15,
              padding: '14px 16px',
              width: '100%',
              border: '1px solid ' + LRH.hairStrong,
              background: '#fff',
              color: LRH.ink,
              outline: 'none',
            }}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setInput('');
                onChange(null);
              }}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                ...mono,
                fontSize: 14,
                color: LRH.mute,
                padding: 4,
              }}
              aria-label="Effacer"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleGeoloc}
          disabled={geolocStatus === 'loading'}
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            padding: '14px 18px',
            background: LRH.navy,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          ◉ {geolocStatus === 'loading' ? 'Localisation…' : 'Me localiser'}
        </button>
      </div>

      {(geolocStatus === 'denied' || geolocStatus === 'error') && (
        <div
          style={{
            ...mono,
            fontSize: 10,
            color: LRH.red,
            letterSpacing: '0.1em',
            marginTop: 6,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {geolocStatus === 'denied'
            ? '⚠ Géolocalisation refusée — saisissez votre commune manuellement'
            : '⚠ Localisation indisponible — saisie manuelle'}
        </div>
      )}

      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid ' + LRH.hairStrong,
            borderTop: `2px solid ${LRH.gold}`,
            zIndex: 20,
            maxHeight: 320,
            overflowY: 'auto',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s.slug}
              type="button"
              onMouseDown={(e) => {
                // onMouseDown plutôt qu'onClick pour devancer le blur de l'input.
                e.preventDefault();
                selectCity(s);
              }}
              style={{
                ...body,
                fontSize: 14,
                fontWeight: 600,
                color: LRH.navy,
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid ' + LRH.hair,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = LRH.paperWarm)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: LRH.gold,
                  flexShrink: 0,
                }}
              />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
