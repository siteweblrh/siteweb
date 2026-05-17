'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { LRH, mono, display, body, ClubCrest } from '../tokens';
import { CityCombobox, type CityChoice } from './CityCombobox';
import type { DirectoryClub } from '@/lib/queries/club';
import { haversineKm, type LatLon } from '@/lib/utils/distance';
import { getCityLatLon } from '@/lib/reunionCityCoords';
import type { Mode } from './Header';

type ClubWithDistance = DirectoryClub & {
  position: LatLon | null;
  distanceKm: number | null;
};

function resolveClubPosition(c: DirectoryClub): LatLon | null {
  // Priorité 1 : lat/lon explicites du club (override admin).
  if (typeof c.latitude === 'number' && typeof c.longitude === 'number') {
    return { lat: c.latitude, lon: c.longitude };
  }
  // Priorité 2 : lat/lon GPS de la commune du club.
  return getCityLatLon(c.city);
}

export function LicenceDirectory({
  clubs,
  mobileVariant = false,
}: {
  clubs: DirectoryClub[];
  mobileVariant?: boolean;
}) {
  const [city, setCity] = useState<CityChoice | null>(null);
  const [modeFilter, setModeFilter] = useState<Mode | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Liste avec distance calculée si une ville est sélectionnée.
  const enriched = useMemo<ClubWithDistance[]>(() => {
    return clubs.map((c) => {
      const pos = resolveClubPosition(c);
      const dist =
        pos && city
          ? haversineKm({ lat: city.lat, lon: city.lon }, pos)
          : null;
      return { ...c, position: pos, distanceKm: dist };
    });
  }, [clubs, city]);

  // Top 3 clubs par proximité (uniquement si ville sélectionnée et club géolocalisé).
  const top3 = useMemo(() => {
    if (!city) return [];
    return enriched
      .filter((c) => c.distanceKm != null)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, 3);
  }, [enriched, city]);

  // Catégories disponibles (union de toutes les catégories pratiquées).
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    for (const c of clubs) for (const cat of c.categories) set.add(cat);
    return Array.from(set).sort();
  }, [clubs]);

  // Annuaire filtré.
  const filtered = useMemo(() => {
    let list = [...enriched];
    if (modeFilter === 'gazon') list = list.filter((c) => c.practiceGazon);
    else if (modeFilter === 'salle') list = list.filter((c) => c.practiceSalle);
    if (categoryFilter !== 'all') {
      list = list.filter((c) => (c.categories as string[]).includes(categoryFilter));
    }
    // Tri : si ville saisie, par distance puis nom ; sinon, par nom.
    if (city) {
      list.sort((a, b) => {
        const da = a.distanceKm ?? Infinity;
        const db = b.distanceKm ?? Infinity;
        if (da !== db) return da - db;
        return a.name.localeCompare(b.name, 'fr');
      });
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }
    return list;
  }, [enriched, modeFilter, categoryFilter, city]);

  return (
    <div
      style={{
        background: LRH.paper,
        padding: mobileVariant
          ? '32px 16px'
          : 'clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px)',
      }}
    >
      {/* Bloc recherche */}
      <div
        style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderLeft: `4px solid ${LRH.gold}`,
          padding: mobileVariant ? 18 : 28,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
          <span style={{ width: 22, height: 2, background: LRH.red }} />
          <span
            style={{
              ...mono,
              fontSize: 10.5,
              fontWeight: 700,
              color: LRH.red,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            01 · Où prendre sa licence ?
          </span>
        </div>
        <h2
          style={{
            ...display,
            fontWeight: 800,
            fontSize: mobileVariant ? 26 : 36,
            color: LRH.navy,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 16,
          }}
        >
          Trouvez votre club.
        </h2>
        <CityCombobox value={city} onChange={setCity} />
      </div>

      {/* Top 3 proximité */}
      {city && top3.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
            <span style={{ width: 22, height: 2, background: LRH.gold }} />
            <span
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                color: LRH.gold,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              02 · Les plus proches de {city.label}
            </span>
            <span style={{ flex: 1, height: 1, background: LRH.hair }} />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mobileVariant ? '1fr' : 'repeat(3, 1fr)',
              gap: mobileVariant ? 10 : 16,
            }}
          >
            {top3.map((c, i) => (
              <ProximityCard key={c.id} club={c} rank={i + 1} mobileVariant={mobileVariant} />
            ))}
          </div>
        </div>
      )}

      {/* Annuaire complet */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ width: 22, height: 2, background: LRH.navy }} />
          <span
            style={{
              ...mono,
              fontSize: 10.5,
              fontWeight: 700,
              color: LRH.navy,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            {city ? '03' : '02'} · Annuaire complet
          </span>
          <span style={{ flex: 1, height: 1, background: LRH.hair, minWidth: 20 }} />
          <span
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            {filtered.length.toString().padStart(2, '0')} club{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Filtres */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 18,
            padding: '12px 14px',
            background: '#fff',
            border: '1px solid ' + LRH.hair,
          }}
        >
          <FilterGroup
            label="Mode"
            value={modeFilter}
            options={[
              { id: 'all', label: 'Tous' },
              { id: 'gazon', label: 'Gazon' },
              { id: 'salle', label: 'Salle' },
            ]}
            onChange={(v) => setModeFilter(v as Mode | 'all')}
          />
          {allCategories.length > 0 && (
            <FilterGroup
              label="Catégorie"
              value={categoryFilter}
              options={[
                { id: 'all', label: 'Toutes' },
                ...allCategories.map((c) => ({ id: c, label: c })),
              ]}
              onChange={setCategoryFilter}
            />
          )}
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px dashed ' + LRH.hairStrong,
              padding: 32,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                ...mono,
                fontSize: 11,
                color: LRH.mute,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              [ Aucun club correspondant ]
            </div>
            <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 8 }}>
              Essayez d&apos;élargir les filtres.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mobileVariant
                ? '1fr'
                : 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: mobileVariant ? 10 : 14,
            }}
          >
            {filtered.map((c) => (
              <DirectoryCard key={c.id} club={c} mobileVariant={mobileVariant} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          ...mono,
          fontSize: 9.5,
          fontWeight: 800,
          color: LRH.mute,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                padding: '5px 10px',
                background: active ? LRH.navy : '#fff',
                color: active ? '#fff' : LRH.ink2,
                border: `1px solid ${active ? LRH.navy : LRH.hairStrong}`,
                cursor: 'pointer',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProximityCard({
  club,
  rank,
  mobileVariant,
}: {
  club: ClubWithDistance;
  rank: number;
  mobileVariant: boolean;
}) {
  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderTop: `4px solid ${LRH.gold}`,
        padding: mobileVariant ? 16 : 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: 14,
          top: 14,
          ...display,
          fontWeight: 800,
          fontSize: 22,
          color: LRH.gold,
          letterSpacing: '-0.02em',
          opacity: 0.55,
        }}
      >
        0{rank}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <ClubCrest id={club.shortCode ?? undefined} size={48} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              ...display,
              fontWeight: 800,
              fontSize: mobileVariant ? 15 : 17,
              color: LRH.navy,
              letterSpacing: '-0.015em',
              lineHeight: 1.15,
            }}
          >
            {club.name}
          </div>
          <div
            style={{
              ...mono,
              fontSize: 9.5,
              color: LRH.mute,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginTop: 3,
            }}
          >
            ◉ {club.city}
            {club.distanceKm != null && (
              <>
                {' · '}
                <span style={{ color: LRH.red }}>
                  {club.distanceKm.toFixed(1)} km
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <PracticeChips club={club} />
      <ClubActions club={club} />
    </article>
  );
}

function DirectoryCard({
  club,
  mobileVariant,
}: {
  club: ClubWithDistance;
  mobileVariant: boolean;
}) {
  const accent = club.kind === 'ENTENTE' ? LRH.gold : LRH.navy;
  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${accent}`,
        padding: mobileVariant ? 14 : 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <ClubCrest id={club.shortCode ?? undefined} size={36} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              ...display,
              fontWeight: 800,
              fontSize: 14.5,
              color: LRH.navy,
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {club.name}
          </div>
          <div
            style={{
              ...mono,
              fontSize: 9,
              color: LRH.mute,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            {club.city}
            {club.distanceKm != null && (
              <>
                {' · '}
                <span style={{ color: LRH.red }}>{club.distanceKm.toFixed(1)} km</span>
              </>
            )}
            {club.kind === 'ENTENTE' && (
              <>
                {' · '}
                <span style={{ color: LRH.gold }}>◆ ENTENTE</span>
              </>
            )}
          </div>
        </div>
      </div>
      <PracticeChips club={club} />
      <ClubActions club={club} />
    </article>
  );
}

function PracticeChips({ club }: { club: ClubWithDistance }) {
  const chips: { label: string; color: string }[] = [];
  if (club.practiceGazon) chips.push({ label: 'Gazon', color: '#1d6b3f' });
  if (club.practiceSalle) chips.push({ label: 'Salle', color: LRH.navy });
  // Catégories : on affiche jusqu'à 4 + un compteur sinon.
  const cats = club.categories.slice(0, 4);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
      {chips.map((c) => (
        <span
          key={c.label}
          style={{
            ...mono,
            fontSize: 9,
            fontWeight: 800,
            color: '#fff',
            background: c.color,
            padding: '2px 6px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {c.label}
        </span>
      ))}
      {cats.map((cat) => (
        <span
          key={cat}
          style={{
            ...mono,
            fontSize: 9,
            fontWeight: 700,
            color: LRH.ink2,
            background: LRH.paperWarm,
            padding: '2px 6px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            border: '1px solid ' + LRH.hair,
          }}
        >
          {cat}
        </span>
      ))}
      {club.categories.length > 4 && (
        <span
          style={{
            ...mono,
            fontSize: 9,
            fontWeight: 700,
            color: LRH.mute,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '2px 4px',
          }}
        >
          +{club.categories.length - 4}
        </span>
      )}
      {chips.length === 0 && club.categories.length === 0 && (
        <span
          style={{
            ...mono,
            fontSize: 9,
            color: LRH.mute,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          Pratiques à confirmer
        </span>
      )}
    </div>
  );
}

function ClubActions({ club }: { club: ClubWithDistance }) {
  const hasContact = Boolean(club.email || club.phone);
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
      <Link
        href={`/clubs/${club.slug}`}
        style={{
          ...mono,
          fontSize: 10.5,
          fontWeight: 700,
          padding: '7px 12px',
          background: LRH.navy,
          color: '#fff',
          textDecoration: 'none',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          flex: 1,
          textAlign: 'center',
          minWidth: 100,
        }}
      >
        ▸ Voir le club
      </Link>
      {hasContact && (
        <a
          href={
            club.email
              ? `mailto:${club.email}?subject=Demande%20de%20licence`
              : `tel:${club.phone}`
          }
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            padding: '7px 12px',
            background: LRH.gold,
            color: LRH.navy,
            textDecoration: 'none',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            flex: 1,
            textAlign: 'center',
            minWidth: 100,
          }}
        >
          ◆ Contacter
        </a>
      )}
    </div>
  );
}
