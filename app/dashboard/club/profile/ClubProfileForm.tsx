'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';
import { updateClubProfile, type ClubProfileRow } from '@/lib/actions/club';
import { parseSocials, type ClubSocialLink } from '@/lib/clubSocials';

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 14,
  padding: '10px 12px',
  width: '100%',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 110,
  fontFamily: 'inherit',
  resize: 'vertical',
  lineHeight: 1.55,
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

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        ...mono,
        fontSize: 10,
        color: LRH.mute,
        letterSpacing: '0.06em',
        marginTop: 6,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          ...mono,
          fontSize: 10.5,
          fontWeight: 700,
          color: LRH.red,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          ...display,
          fontWeight: 700,
          fontSize: 20,
          color: LRH.navy,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: '3px solid ' + LRH.navy,
        padding: 24,
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  );
}

export function ClubProfileForm({ profile }: { profile: ClubProfileRow }) {
  const router = useRouter();
  const [form, setForm] = useState({
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    website: profile.website ?? '',
    address: profile.address ?? '',
    socials: parseSocials(profile.socials) as ClubSocialLink[],
    description: profile.description ?? '',
    primaryColor: profile.primaryColor ?? '',
    logo: profile.logo ?? '',
    foundedYear: profile.foundedYear?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setOk(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);
    setSaving(true);
    try {
      const foundedYearNum =
        form.foundedYear.trim() === '' ? null : Number(form.foundedYear.trim());
      if (foundedYearNum !== null && (!Number.isInteger(foundedYearNum) || foundedYearNum < 1900)) {
        throw new Error("Année de fondation invalide (entier > 1900)");
      }
      const cleanSocials = form.socials
        .map((s) => ({ label: s.label.trim(), url: s.url.trim() }))
        .filter((s) => s.label.length > 0 || s.url.length > 0);

      await updateClubProfile(profile.id, {
        email: form.email.trim(),
        phone: form.phone.trim(),
        website: form.website.trim(),
        address: form.address.trim(),
        socials: cleanSocials,
        description: form.description.trim(),
        primaryColor: form.primaryColor.trim(),
        logo: form.logo.trim(),
        foundedYear: foundedYearNum,
      });
      setOk(true);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const previewColor = form.primaryColor.match(/^#?[0-9a-fA-F]{6}$/)
    ? form.primaryColor.startsWith('#')
      ? form.primaryColor
      : '#' + form.primaryColor
    : null;

  return (
    <form onSubmit={onSubmit}>
      {/* Identity (read-only) */}
      <Card>
        <SectionHeader kicker="01 · Identité" title="Référencement officiel" />
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr', gap: 16 }}>
          <div>
            <FieldLabel>Nom du club</FieldLabel>
            <input style={{ ...inputStyle, background: LRH.paperWarm }} value={profile.name} disabled />
          </div>
          <div>
            <FieldLabel>Ville</FieldLabel>
            <input style={{ ...inputStyle, background: LRH.paperWarm }} value={profile.city} disabled />
          </div>
          <div>
            <FieldLabel>Code court</FieldLabel>
            <input
              style={{ ...inputStyle, background: LRH.paperWarm }}
              value={profile.shortCode ?? '—'}
              disabled
            />
          </div>
        </div>
        <FieldHint>
          Ces champs sont administrés par la ligue. Contactez la LRH pour toute correction.
        </FieldHint>
      </Card>

      {/* Logo + branding */}
      <Card>
        <SectionHeader kicker="02 · Image" title="Logo & couleur" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <ImageUploader
              label="Logo du club"
              value={form.logo}
              onChange={(url) => set('logo', url ?? '')}
              hint="PNG/SVG transparent recommandé. Affiché sur la fiche publique."
              height={160}
            />
          </div>
          <div>
            <FieldLabel>Couleur principale</FieldLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="text"
                placeholder="#002244"
                value={form.primaryColor}
                onChange={(e) => set('primaryColor', e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <div
                aria-hidden
                style={{
                  width: 44,
                  height: 44,
                  border: '1px solid ' + LRH.hairStrong,
                  background: previewColor ?? '#fff',
                  flexShrink: 0,
                }}
              />
            </div>
            <FieldHint>Code hexadécimal (#RRGGBB). Utilisé comme accent sur votre fiche.</FieldHint>

            <div style={{ marginTop: 22 }}>
              <FieldLabel>Année de fondation</FieldLabel>
              <input
                type="number"
                min={1900}
                max={new Date().getFullYear() + 1}
                placeholder="1998"
                value={form.foundedYear}
                onChange={(e) => set('foundedYear', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Contacts */}
      <Card>
        <SectionHeader kicker="03 · Contacts" title="Comment vous joindre" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <FieldLabel>Email club</FieldLabel>
            <input
              type="email"
              placeholder="contact@monclub.re"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>Téléphone</FieldLabel>
            <input
              type="tel"
              placeholder="+262 ..."
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <FieldLabel>Site web</FieldLabel>
            <input
              type="url"
              placeholder="https://monclub.re"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>Adresse postale</FieldLabel>
            <input
              type="text"
              placeholder="..."
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </Card>

      {/* Socials */}
      <Card>
        <SectionHeader kicker="04 · Réseaux" title="Réseaux sociaux & liens" />
        <FieldHint>
          Ajoutez autant de liens que vous voulez (Instagram, Facebook, TikTok, YouTube, LinkedIn, X, etc.). L'icône s'adapte automatiquement au domaine sur votre fiche publique.
        </FieldHint>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {form.socials.length === 0 && (
            <div
              style={{
                ...mono,
                fontSize: 11,
                color: LRH.mute,
                letterSpacing: '0.08em',
                padding: '10px 12px',
                background: LRH.paperWarm,
                border: '1px dashed ' + LRH.hairStrong,
              }}
            >
              Aucun lien pour l'instant.
            </div>
          )}
          {form.socials.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr auto auto',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                placeholder="Étiquette (TikTok…)"
                value={s.label}
                maxLength={40}
                onChange={(e) => {
                  const next = [...form.socials];
                  next[i] = { ...next[i], label: e.target.value };
                  set('socials', next);
                }}
                style={inputStyle}
              />
              <input
                type="url"
                placeholder="https://…"
                value={s.url}
                onChange={(e) => {
                  const next = [...form.socials];
                  next[i] = { ...next[i], url: e.target.value };
                  set('socials', next);
                }}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (i === 0) return;
                    const next = [...form.socials];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    set('socials', next);
                  }}
                  disabled={i === 0}
                  title="Monter"
                  style={{
                    ...mono,
                    fontSize: 14,
                    padding: '8px 10px',
                    background: '#fff',
                    color: i === 0 ? LRH.hairStrong : LRH.navy,
                    border: '1px solid ' + LRH.hairStrong,
                    cursor: i === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (i === form.socials.length - 1) return;
                    const next = [...form.socials];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    set('socials', next);
                  }}
                  disabled={i === form.socials.length - 1}
                  title="Descendre"
                  style={{
                    ...mono,
                    fontSize: 14,
                    padding: '8px 10px',
                    background: '#fff',
                    color:
                      i === form.socials.length - 1 ? LRH.hairStrong : LRH.navy,
                    border: '1px solid ' + LRH.hairStrong,
                    cursor:
                      i === form.socials.length - 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ↓
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  set('socials', form.socials.filter((_, j) => j !== i));
                }}
                style={{
                  ...mono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '8px 12px',
                  background: '#fff',
                  color: LRH.red,
                  border: '1px solid ' + LRH.red,
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Retirer
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              if (form.socials.length >= 12) return;
              set('socials', [...form.socials, { label: '', url: '' }]);
            }}
            disabled={form.socials.length >= 12}
            style={{
              alignSelf: 'flex-start',
              ...body,
              fontSize: 11.5,
              fontWeight: 700,
              padding: '8px 16px',
              background: 'transparent',
              color: form.socials.length >= 12 ? LRH.mute : LRH.navy,
              border:
                '1px solid ' +
                (form.socials.length >= 12 ? LRH.hairStrong : LRH.navy),
              cursor: form.socials.length >= 12 ? 'not-allowed' : 'pointer',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            + Ajouter un lien {form.socials.length >= 12 ? '(12 max)' : ''}
          </button>
        </div>
      </Card>

      {/* Description */}
      <Card>
        <SectionHeader kicker="05 · Présentation" title="Texte de présentation" />
        <FieldLabel>Description</FieldLabel>
        <textarea
          rows={5}
          maxLength={2000}
          placeholder="Histoire, valeurs, équipes engagées, palmarès..."
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          style={textareaStyle}
        />
        <FieldHint>
          Apparaît dans la section "Présentation" de votre fiche publique. {form.description.length}/2000
        </FieldHint>
      </Card>

      {error && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            marginBottom: 16,
            padding: '10px 14px',
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
            marginBottom: 16,
            padding: '10px 14px',
            background: 'rgba(44,122,63,0.08)',
            border: '1px solid rgba(44,122,63,0.2)',
          }}
        >
          ✓ Profil mis à jour
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            ...body,
            fontSize: 12.5,
            fontWeight: 700,
            padding: '12px 24px',
            background: LRH.navy,
            color: '#fff',
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
        </button>
        <a
          href={`/clubs/${profile.slug}`}
          target="_blank"
          rel="noreferrer"
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: LRH.navy,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            padding: '12px 18px',
            border: '1px solid ' + LRH.hairStrong,
            background: '#fff',
          }}
        >
          Voir la fiche publique ↗
        </a>
      </div>
    </form>
  );
}
