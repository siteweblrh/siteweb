'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, mono } from '@/components/lrh/tokens';
import {
  setClubHomeVenue,
  setClubTrainingVenue,
  createVenue,
} from '@/lib/actions/venue';
import type { VenueAdminRow, ClubVenuePreferences } from '@/lib/queries/venue';

type Mode = 'GAZON' | 'SALLE';
type Kind = 'home' | 'training';

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 14,
  padding: '10px 12px',
  width: '100%',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  fontWeight: 700,
  color: LRH.mute,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 6,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={labelStyle}>{children}</label>;
}

/**
 * Lien Google Maps cliquable. Encode l'adresse (+ ville en fallback) en
 * paramètre `q` de l'URL — Google déduit le pays automatiquement.
 */
function MapsLink({ address, city }: { address: string | null | undefined; city: string }) {
  const q = encodeURIComponent(`${address || ''} ${city} Réunion`.trim());
  const href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...mono,
        fontSize: 11,
        color: LRH.navy,
        letterSpacing: '0.06em',
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
      }}
    >
      ◉ {address || city} ↗
    </a>
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeading
        kicker="01 · Terrains de match"
        title="Où votre club joue à domicile"
        subtitle="Sélectionnez les terrains domicile pour les matchs officiels. Ces terrains sont proposés par défaut lors de la création d'un match."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
        <VenueCard
          clubId={clubId}
          clubName={clubName}
          kind="home"
          mode="GAZON"
          title="Terrain gazon (match)"
          accent="#2c7a3f"
          currentVenueId={preferences.homeVenueGazonId ?? ''}
          currentVenue={preferences.homeVenueGazon}
          venues={gazonVenues}
        />
        <VenueCard
          clubId={clubId}
          clubName={clubName}
          kind="home"
          mode="SALLE"
          title="Terrain salle (match)"
          accent={LRH.navy}
          currentVenueId={preferences.homeVenueSalleId ?? ''}
          currentVenue={preferences.homeVenueSalle}
          venues={salleVenues}
        />
      </div>

      <SectionHeading
        kicker="02 · Terrains d'entraînement"
        title="Où votre club s'entraîne"
        subtitle="Optionnel. Si différents des terrains de match, ils seront affichés sur la fiche publique du club."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
        <VenueCard
          clubId={clubId}
          clubName={clubName}
          kind="training"
          mode="GAZON"
          title="Terrain gazon (entraînement)"
          accent="#2c7a3f"
          currentVenueId={preferences.trainingVenueGazonId ?? ''}
          currentVenue={preferences.trainingVenueGazon}
          venues={gazonVenues}
        />
        <VenueCard
          clubId={clubId}
          clubName={clubName}
          kind="training"
          mode="SALLE"
          title="Terrain salle (entraînement)"
          accent={LRH.navy}
          currentVenueId={preferences.trainingVenueSalleId ?? ''}
          currentVenue={preferences.trainingVenueSalle}
          venues={salleVenues}
        />
      </div>
    </div>
  );
}

function SectionHeading({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
        {kicker}
      </div>
      <div style={{ ...body, fontSize: 16, fontWeight: 700, color: LRH.navy, letterSpacing: '-0.01em', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ ...body, fontSize: 12.5, color: LRH.mute, maxWidth: 720 }}>
        {subtitle}
      </div>
    </div>
  );
}

function VenueCard({
  clubId,
  clubName,
  kind,
  mode,
  title,
  accent,
  currentVenueId,
  currentVenue,
  venues,
}: {
  clubId: string;
  clubName: string;
  kind: Kind;
  mode: Mode;
  title: string;
  accent: string;
  currentVenueId: string;
  currentVenue: { id: string; name: string; city: string; address: string | null } | null;
  venues: VenueAdminRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(currentVenueId);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const persist = (newVenueId: string | null) => {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        if (kind === 'home') {
          await setClubHomeVenue(clubId, { mode, venueId: newVenueId });
        } else {
          await setClubTrainingVenue(clubId, { mode, venueId: newVenueId });
        }
        setOk(true);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  const handleSelectChange = (v: string) => {
    setSelectedId(v);
    persist(v || null);
  };

  const handleCreated = (createdVenueId: string) => {
    setShowCreate(false);
    setSelectedId(createdVenueId);
    persist(createdVenueId);
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${accent}`,
        padding: 20,
        opacity: isPending ? 0.7 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, background: accent }} />
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>

      <FieldLabel>Terrain</FieldLabel>
      <select
        style={{ ...inputStyle, cursor: 'pointer' }}
        value={selectedId}
        onChange={(e) => handleSelectChange(e.target.value)}
        disabled={isPending}
      >
        <option value="">— Aucun terrain défini —</option>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name} · {v.city}
          </option>
        ))}
      </select>

      {/* Adresse cliquable du terrain courant. Utilise currentVenue (depuis preferences)
          plutôt que selectedId pour afficher la valeur sauvegardée — évite un état "fantôme"
          entre clic et fin de la mutation. */}
      {currentVenue && (
        <div style={{ marginTop: 8 }}>
          <MapsLink address={currentVenue.address} city={currentVenue.city} />
        </div>
      )}

      {/* Bouton "+ Ajouter un nouveau terrain" */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed ' + LRH.hairStrong }}>
        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            style={{
              ...mono,
              fontSize: 10,
              fontWeight: 700,
              padding: '8px 14px',
              background: 'transparent',
              color: LRH.navy,
              border: '1px solid ' + LRH.navy,
              cursor: 'pointer',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            + Ajouter un terrain
          </button>
        ) : (
          <NewVenueForm
            mode={mode}
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        )}
      </div>

      {/* Feedback */}
      {error && (
        <div style={{
          ...mono, fontSize: 11, color: LRH.red, marginTop: 12,
          padding: '8px 12px',
          background: 'rgba(168,32,47,0.08)', border: '1px solid rgba(168,32,47,0.2)',
        }}>
          ⚠ {error}
        </div>
      )}
      {ok && !showCreate && (
        <div style={{
          ...mono, fontSize: 11, color: '#2c7a3f', marginTop: 12,
          padding: '8px 12px',
          background: 'rgba(44,122,63,0.08)', border: '1px solid rgba(44,122,63,0.2)',
        }}>
          ✓ Enregistré
        </div>
      )}

      <div style={{
        marginTop: 16, paddingTop: 12,
        borderTop: '1px dashed ' + LRH.hairStrong,
        ...mono, fontSize: 9.5, color: LRH.mute,
        letterSpacing: '0.06em', lineHeight: 1.6,
      }}>
        {kind === 'home'
          ? `Si ${clubName} ne dispose pas de terrain officiel, laissez vide — la ligue affectera un terrain à chaque match.`
          : `Optionnel — affiché sur la fiche publique de ${clubName} si renseigné.`}
      </div>
    </div>
  );
}

function NewVenueForm({
  mode,
  onCreated,
  onCancel,
}: {
  mode: Mode;
  onCreated: (venueId: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (!name.trim() || !city.trim()) {
      setError('Le nom et la ville sont obligatoires.');
      return;
    }
    startTransition(async () => {
      try {
        const created = await createVenue({
          name: name.trim(),
          city: city.trim(),
          address: address.trim() || null,
          supportsGazon: mode === 'GAZON',
          supportsSalle: mode === 'SALLE',
        });
        onCreated(created.id);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur de création');
      }
    });
  };

  return (
    <div style={{
      padding: 14,
      background: LRH.paperWarm,
      border: '1px solid ' + LRH.hairStrong,
    }}>
      <div style={{
        ...mono, fontSize: 10, fontWeight: 700,
        color: LRH.navy, letterSpacing: '0.14em',
        textTransform: 'uppercase', marginBottom: 10,
      }}>
        Nouveau terrain {mode === 'GAZON' ? 'gazon' : 'salle'}
      </div>

      <div style={{ marginBottom: 10 }}>
        <FieldLabel>Nom du terrain *</FieldLabel>
        <input
          style={inputStyle}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Stade municipal de Saint-Paul"
          disabled={isPending}
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <FieldLabel>Ville *</FieldLabel>
        <input
          style={inputStyle}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Saint-Paul"
          disabled={isPending}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Adresse complète</FieldLabel>
        <input
          style={inputStyle}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="12 rue des Hibiscus, 97460 Saint-Paul"
          disabled={isPending}
        />
        <div style={{ ...mono, fontSize: 9.5, color: LRH.mute, marginTop: 4, letterSpacing: '0.06em' }}>
          Sera affichée publiquement avec un lien Google Maps.
        </div>
      </div>

      {error && (
        <div style={{
          ...mono, fontSize: 11, color: LRH.red, marginBottom: 10,
          padding: '8px 12px',
          background: 'rgba(168,32,47,0.08)', border: '1px solid rgba(168,32,47,0.2)',
        }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={submit}
          disabled={isPending}
          style={{
            ...mono, fontSize: 10, fontWeight: 700,
            padding: '10px 16px',
            background: LRH.navy, color: '#fff',
            border: 'none', cursor: 'pointer',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Création…' : '✓ Créer & sélectionner'}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          style={{
            ...mono, fontSize: 10, fontWeight: 700,
            padding: '10px 16px',
            background: 'transparent', color: LRH.mute,
            border: '1px solid ' + LRH.hairStrong, cursor: 'pointer',
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
