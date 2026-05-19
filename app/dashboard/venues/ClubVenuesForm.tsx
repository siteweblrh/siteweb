'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { setClubHomeVenue } from '@/lib/actions/venue';
import type { VenueAdminRow, ClubVenuePreferences } from '@/lib/queries/venue';

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 14,
  padding: '10px 12px',
  width: '100%',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
  cursor: 'pointer',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        ...mono,
        fontSize: 10,
        fontWeight: 700,
        color: LRH.mute,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

export function ClubVenuesForm({
  clubId,
  clubName,
  preferences,
  gazonVenues,
  salleVenues,
}: {
  clubId: string;
  clubName: string;
  preferences: ClubVenuePreferences;
  gazonVenues: VenueAdminRow[];
  salleVenues: VenueAdminRow[];
}) {
  const router = useRouter();
  const [gazonId, setGazonId] = useState<string>(preferences.homeVenueGazonId ?? '');
  const [salleId, setSalleId] = useState<string>(preferences.homeVenueSalleId ?? '');
  const [savingGazon, setSavingGazon] = useState(false);
  const [savingSalle, setSavingSalle] = useState(false);
  const [errorGazon, setErrorGazon] = useState<string | null>(null);
  const [errorSalle, setErrorSalle] = useState<string | null>(null);
  const [okGazon, setOkGazon] = useState(false);
  const [okSalle, setOkSalle] = useState(false);

  const saveGazon = async () => {
    setSavingGazon(true);
    setErrorGazon(null);
    setOkGazon(false);
    try {
      await setClubHomeVenue(clubId, { mode: 'GAZON', venueId: gazonId || null });
      setOkGazon(true);
      router.refresh();
    } catch (e: any) {
      setErrorGazon(e?.message || 'Erreur');
    } finally {
      setSavingGazon(false);
    }
  };

  const saveSalle = async () => {
    setSavingSalle(true);
    setErrorSalle(null);
    setOkSalle(false);
    try {
      await setClubHomeVenue(clubId, { mode: 'SALLE', venueId: salleId || null });
      setOkSalle(true);
      router.refresh();
    } catch (e: any) {
      setErrorSalle(e?.message || 'Erreur');
    } finally {
      setSavingSalle(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 24 }}>
      <VenueCard
        title="Terrain gazon"
        accent="#2c7a3f"
        clubName={clubName}
        currentVenueId={gazonId}
        setVenueId={setGazonId}
        venues={gazonVenues}
        saving={savingGazon}
        onSave={saveGazon}
        error={errorGazon}
        ok={okGazon}
        emptyHint="Aucun terrain gazon enregistré dans le registre — la ligue doit en ajouter d'abord."
      />
      <VenueCard
        title="Terrain salle"
        accent={LRH.navy}
        clubName={clubName}
        currentVenueId={salleId}
        setVenueId={setSalleId}
        venues={salleVenues}
        saving={savingSalle}
        onSave={saveSalle}
        error={errorSalle}
        ok={okSalle}
        emptyHint="Aucun terrain salle enregistré dans le registre — la ligue doit en ajouter d'abord."
      />
    </div>
  );
}

function VenueCard({
  title,
  accent,
  clubName,
  currentVenueId,
  setVenueId,
  venues,
  saving,
  onSave,
  error,
  ok,
  emptyHint,
}: {
  title: string;
  accent: string;
  clubName: string;
  currentVenueId: string;
  setVenueId: (v: string) => void;
  venues: VenueAdminRow[];
  saving: boolean;
  onSave: () => void;
  error: string | null;
  ok: boolean;
  emptyHint: string;
}) {
  const current = venues.find((v) => v.id === currentVenueId);
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${accent}`,
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span
          style={{
            width: 6,
            height: 6,
            background: accent,
          }}
        />
        <span
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            color: accent,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </span>
      </div>

      <FieldLabel>Terrain domicile</FieldLabel>
      {venues.length === 0 ? (
        <div
          style={{
            padding: 14,
            background: LRH.paperWarm,
            border: '1px dashed ' + LRH.hairStrong,
            ...body,
            fontSize: 12.5,
            color: LRH.mute,
          }}
        >
          {emptyHint}
        </div>
      ) : (
        <>
          <select
            style={inputStyle}
            value={currentVenueId}
            onChange={(e) => setVenueId(e.target.value)}
          >
            <option value="">— Aucun terrain défini —</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.city}
              </option>
            ))}
          </select>
          {current && current.address && (
            <div
              style={{
                ...mono,
                fontSize: 11,
                color: LRH.mute,
                letterSpacing: '0.06em',
                marginTop: 8,
              }}
            >
              ◉ {current.address}
            </div>
          )}
        </>
      )}

      {error && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(168,32,47,0.08)',
            border: '1px solid rgba(168,32,47,0.2)',
          }}
        >
          ⚠ {error}
        </div>
      )}
      {ok && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: '#2c7a3f',
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(44,122,63,0.08)',
            border: '1px solid rgba(44,122,63,0.2)',
          }}
        >
          ✓ Enregistré
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving || venues.length === 0}
        style={{
          marginTop: 14,
          ...body,
          fontSize: 12.5,
          fontWeight: 700,
          padding: '10px 18px',
          borderRadius: 4,
          background: venues.length === 0 ? LRH.hairStrong : LRH.navy,
          color: '#fff',
          border: 'none',
          cursor: venues.length === 0 ? 'not-allowed' : 'pointer',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>

      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px dashed ' + LRH.hairStrong,
          ...mono,
          fontSize: 10,
          color: LRH.mute,
          letterSpacing: '0.08em',
          lineHeight: 1.6,
        }}
      >
        Si {clubName} ne dispose pas de terrain officiel, laissez vide — la ligue choisira un terrain à la création de chaque match.
      </div>
    </div>
  );
}
