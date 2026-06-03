'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import {
  COMPETITION_ROWS,
  LEISURE_ROWS,
  MAX_REFEREES,
  ENGAGEMENT_FEE_EUR,
  ENGAGEMENT_DEADLINE,
  getSubmissionErrors,
  type EngagementData,
  type Contact,
  type EngagementRefereeRow,
} from '@/lib/engagement/schema';

// ─── Primitives de champ (style éditorial LRH, inline) ──────────────────────
const inputStyle: React.CSSProperties = {
  ...body, fontSize: 14, padding: '10px 12px', width: '100%',
  border: '1px solid ' + LRH.hairStrong, borderRadius: 4,
  background: '#fff', color: LRH.ink,
};

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{
      ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute,
      letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
    }}>{children}</label>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, id, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; id?: string; disabled?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id} type={type} value={value} placeholder={placeholder} disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, opacity: disabled ? 0.6 : 1 }}
      />
    </div>
  );
}

function SectionHeader({ num, kicker, title, desc }: { num: string; kicker: string; title: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ ...mono, fontSize: 10.5, fontWeight: 700, color: LRH.red, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6 }}>
        {num} · {kicker}
      </div>
      <div style={{ ...display, fontWeight: 700, fontSize: 22, color: LRH.navy, letterSpacing: '-0.02em' }}>{title}</div>
      {desc && <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 680 }}>{desc}</p>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid ' + LRH.hair, borderLeft: '3px solid ' + LRH.navy, padding: 'clamp(16px, 3vw, 24px)', marginBottom: 22 }}>
      {children}
    </div>
  );
}

const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 };

function CheckRow({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: disabled ? 'default' : 'pointer', padding: '6px 0', minHeight: 44 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ width: 18, height: 18, accentColor: LRH.navy, flexShrink: 0 }} />
      <span style={{ ...body, fontSize: 13.5, color: LRH.ink }}>{label}</span>
    </label>
  );
}

function ContactFields({ value, onChange, withAddress, disabled }: {
  value: Contact; onChange: (c: Contact) => void; withAddress?: boolean; disabled?: boolean;
}) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={grid2}>
        <Field label="Nom & Prénom" value={value.name} onChange={(v) => onChange({ ...value, name: v })} disabled={disabled} />
        <Field label="Téléphone" type="tel" value={value.phone} onChange={(v) => onChange({ ...value, phone: v })} disabled={disabled} />
      </div>
      <div style={grid2}>
        <Field label="Email" type="email" value={value.email} onChange={(v) => onChange({ ...value, email: v })} disabled={disabled} />
        {withAddress && <Field label="Adresse postale" value={value.address ?? ''} onChange={(v) => onChange({ ...value, address: v })} disabled={disabled} />}
      </div>
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ ...display, fontWeight: 700, fontSize: 14, color: LRH.navy, margin: '4px 0 10px' }}>{children}</div>;
}

// ─── Props ───────────────────────────────────────────────────────────────
export type EngagementFormProps = {
  initialData: EngagementData;
  initialDecl?: {
    signedByName?: string;
    signedCity?: string;
    paymentMethod?: 'TRANSFER' | 'CHECK' | null;
  };
  status: 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED';
  rejectedReason?: string | null;
  season: string;
  rgpdText?: string;
  /** Sauvegarde sans soumettre. Renvoie void ou throw (message d'erreur). */
  saveDraft: (data: EngagementData) => Promise<void>;
  /** Soumission finale à la ligue. */
  submit: (data: EngagementData, decl: {
    signedByName: string; signedCity: string; rgpdAccepted: boolean;
    declarationAccepted: boolean; paymentMethod: 'TRANSFER' | 'CHECK' | null;
  }) => Promise<void>;
};

const DEFAULT_RGPD =
  "Les informations personnelles collectées via ce formulaire (noms, téléphones, emails, adresses) sont nécessaires au traitement administratif de l'engagement des clubs, à l'organisation des championnats et à la communication officielle de la Ligue. Elles sont conservées pendant la durée de la saison sportive et destinées exclusivement aux membres du bureau et des commissions de la Ligue. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression en contactant le secrétariat de la Ligue.";

export function EngagementForm({ initialData, initialDecl, status, rejectedReason, season, rgpdText, saveDraft, submit }: EngagementFormProps) {
  const [data, setData] = useState<EngagementData>(initialData);
  const [signedByName, setSignedByName] = useState(initialDecl?.signedByName ?? '');
  const [signedCity, setSignedCity] = useState(initialDecl?.signedCity ?? initialData.general.city ?? '');
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CHECK' | null>(initialDecl?.paymentMethod ?? null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [rgpdAccepted, setRgpdAccepted] = useState(false);

  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);

  const readOnly = status === 'SUBMITTED' || status === 'VALIDATED';

  // Helper d'update immuable d'un sous-arbre via fonction.
  function patch(fn: (draft: EngagementData) => void) {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  const decl = { signedByName, signedCity, rgpdAccepted, declarationAccepted, paymentMethod };
  const submissionErrors = useMemo(() => getSubmissionErrors(data, decl), [data, signedByName, signedCity, rgpdAccepted, declarationAccepted, paymentMethod]);

  function runSaveDraft() {
    setFeedback(null);
    startTransition(async () => {
      try {
        await saveDraft(data);
        setFeedback({ kind: 'ok', msg: 'Brouillon enregistré.' });
      } catch (e) {
        setFeedback({ kind: 'error', msg: e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement.' });
      }
    });
  }

  function runSubmit() {
    setFeedback(null);
    if (submissionErrors.length > 0) {
      setFeedback({ kind: 'error', msg: submissionErrors[0]! });
      return;
    }
    startTransition(async () => {
      try {
        await submit(data, decl);
        setFeedback({ kind: 'ok', msg: 'Fiche soumise à la Ligue.' });
      } catch (e) {
        setFeedback({ kind: 'error', msg: e instanceof Error ? e.message : 'Erreur lors de la soumission.' });
      }
    });
  }

  return (
    <div style={{ maxWidth: 920 }}>
      <StatusBanner status={status} rejectedReason={rejectedReason} season={season} />

      {/* SECTION 1 */}
      <Card>
        <SectionHeader num="01" kicker="Informations club" title="Informations générales." />
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={grid2}>
            <Field label="Nom officiel du club" value={data.general.clubName} disabled={readOnly} onChange={(v) => patch((d) => { d.general.clubName = v; })} />
            <Field label="Ville" value={data.general.city} disabled={readOnly} onChange={(v) => patch((d) => { d.general.city = v; })} />
          </div>
          <div style={grid2}>
            <Field label="N° d'affiliation FFH" value={data.general.ffhAffiliation} disabled={readOnly} onChange={(v) => patch((d) => { d.general.ffhAffiliation = v; })} />
            <div>
              <Label>Affiliation Ligue à jour ?</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ v: true, l: 'Oui, à jour' }, { v: false, l: 'En régularisation' }].map((o) => (
                  <button key={String(o.v)} type="button" disabled={readOnly}
                    onClick={() => patch((d) => { d.general.ligueAffiliationUpToDate = o.v; })}
                    style={toggleBtn(data.general.ligueAffiliationUpToDate === o.v)}>{o.l}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <CheckRow label="Entente inter-clubs" checked={data.general.entente.active} disabled={readOnly} onChange={(v) => patch((d) => { d.general.entente.active = v; })} />
            {data.general.entente.active && (
              <Field label="Club partenaire" value={data.general.entente.partnerName} disabled={readOnly} onChange={(v) => patch((d) => { d.general.entente.partnerName = v; })} />
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            <SubLabel>Couleurs officielles des tenues (Séniors)</SubLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
              {(['home', 'away'] as const).map((side) => (
                <div key={side} style={{ border: '1px solid ' + LRH.hair, padding: 14 }}>
                  <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                    {side === 'home' ? 'Domicile' : 'Extérieur'}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <Field label="Maillot" value={data.general.kit[side].jersey} disabled={readOnly} onChange={(v) => patch((d) => { d.general.kit[side].jersey = v; })} />
                    <Field label="Short / Jupe" value={data.general.kit[side].shorts} disabled={readOnly} onChange={(v) => patch((d) => { d.general.kit[side].shorts = v; })} />
                    <Field label="Bas / Chaussettes" value={data.general.kit[side].socks} disabled={readOnly} onChange={(v) => patch((d) => { d.general.kit[side].socks = v; })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 2 */}
      <Card>
        <SectionHeader num="02" kicker="Dirigeants" title="Contacts & équipe dirigeante." />
        <div style={{ display: 'grid', gap: 22 }}>
          {([
            ['president', 'Président(e)', true],
            ['secretary', 'Secrétaire Général(e)', false],
            ['treasurer', 'Trésorier(e)', false],
            ['seniorCompetitions', 'Responsable Compétitions Séniors', false],
            ['youthCompetitions', 'Responsable Compétitions Jeunes', false],
            ['refereeManager', 'Responsable Arbitrage Club', false],
          ] as const).map(([key, label, withAddress]) => (
            <div key={key}>
              <SubLabel>{label}</SubLabel>
              <ContactFields
                value={data.contacts[key]}
                withAddress={withAddress}
                disabled={readOnly}
                onChange={(c) => patch((d) => { d.contacts[key] = c; })}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* SECTION 3 */}
      <Card>
        <SectionHeader num="03" kicker="Infrastructures" title="Installations & disponibilités." />
        <div style={{ display: 'grid', gap: 14 }}>
          <Field label="Nom de l'installation principale" value={data.infrastructure.facilityName} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.facilityName = v; })} placeholder="ex : Gymnase du Guillaume" />
          <Field label="Adresse complète" value={data.infrastructure.facilityAddress} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.facilityAddress = v; })} />
          <div>
            <SubLabel>Équipements disponibles</SubLabel>
            <CheckRow label="Vestiaires joueurs accessibles" checked={data.infrastructure.equipment.playerLockers} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.equipment.playerLockers = v; })} />
            <CheckRow label="Vestiaires arbitres dédiés" checked={data.infrastructure.equipment.refereeLockers} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.equipment.refereeLockers = v; })} />
            <CheckRow label="Tableau d'affichage électronique (Hockey en Salle)" checked={data.infrastructure.equipment.scoreboard} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.equipment.scoreboard = v; })} />
          </div>
          <div>
            <SubLabel>Créneaux prévisibles — Séniors</SubLabel>
            <div style={grid2}>
              <Field label="Lundi → Vendredi" value={data.infrastructure.schedules.seniors.weekdays} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.schedules.seniors.weekdays = v; })} />
              <Field label="Samedi" value={data.infrastructure.schedules.seniors.saturday} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.schedules.seniors.saturday = v; })} />
              <Field label="Dimanche" value={data.infrastructure.schedules.seniors.sunday} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.schedules.seniors.sunday = v; })} />
            </div>
          </div>
          <div>
            <SubLabel>Créneaux prévisibles — Jeunes</SubLabel>
            <div style={grid2}>
              <Field label="Mercredi" value={data.infrastructure.schedules.youth.wednesday} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.schedules.youth.wednesday = v; })} />
              <Field label="Samedi" value={data.infrastructure.schedules.youth.saturday} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.schedules.youth.saturday = v; })} />
              <Field label="Dimanche" value={data.infrastructure.schedules.youth.sunday} disabled={readOnly} onChange={(v) => patch((d) => { d.infrastructure.schedules.youth.sunday = v; })} />
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 4 */}
      <Card>
        <SectionHeader num="04" kicker="Compétitions" title="Engagements officiels." desc="Indiquez le nombre d'équipes engagées par catégorie (0 = pas d'engagement)." />
        <EntryTable rows={COMPETITION_ROWS} data={data.competitions} disabled={readOnly} onChange={(key, field, value) => patch((d) => { (d.competitions[key] as any)[field] = value; })} />
      </Card>

      {/* SECTION 5 */}
      <Card>
        <SectionHeader num="05" kicker="Loisirs & événements" title="Plateaux & rassemblements." />
        <EntryTable rows={LEISURE_ROWS} data={data.leisure} disabled={readOnly} onChange={(key, field, value) => patch((d) => { (d.leisure[key] as any)[field] = value; })} />
      </Card>

      {/* SECTION 6 */}
      <Card>
        <SectionHeader num="06" kicker="Arbitrage" title="Arbitres du club (Séniors)." desc="Obligation réglementaire selon le niveau d'engagement du club." />
        <RefereeTable referees={data.referees} disabled={readOnly}
          onChange={(rows) => patch((d) => { d.referees = rows; })} />
      </Card>

      {/* SECTION 7 — règlement & déclaration */}
      <Card>
        <SectionHeader num="07" kicker="Validation" title="Règlement & déclaration." desc={`Frais d'engagement : ${ENGAGEMENT_FEE_EUR} € · Date limite : ${ENGAGEMENT_DEADLINE}.`} />
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <SubLabel>Mode de règlement</SubLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" disabled={readOnly} onClick={() => setPaymentMethod('TRANSFER')} style={toggleBtn(paymentMethod === 'TRANSFER')}>Virement bancaire</button>
              <button type="button" disabled={readOnly} onClick={() => setPaymentMethod('CHECK')} style={toggleBtn(paymentMethod === 'CHECK')}>Chèque bancaire</button>
            </div>
            <p style={{ ...body, fontSize: 12, color: LRH.mute, margin: '8px 0 0' }}>
              Le règlement est constaté à réception par la Ligue. Indiquez le nom du club dans le libellé du virement.
            </p>
          </div>

          <div style={{ background: LRH.paperWarm, border: '1px solid ' + LRH.hair, padding: 14 }}>
            <p style={{ ...body, fontSize: 11.5, color: LRH.mute, margin: 0, lineHeight: 1.6 }}>{rgpdText ?? DEFAULT_RGPD}</p>
          </div>

          <div style={grid2}>
            <Field label="Fait à (ville)" value={signedCity} disabled={readOnly} onChange={setSignedCity} />
            <Field label="Nom du/de la signataire (Président·e)" value={signedByName} disabled={readOnly} onChange={setSignedByName} />
          </div>

          <CheckRow disabled={readOnly} checked={declarationAccepted} onChange={setDeclarationAccepted}
            label="Je certifie sur l'honneur l'exactitude des informations et accepte les règlements de la Ligue et de la FFH." />
          <CheckRow disabled={readOnly} checked={rgpdAccepted} onChange={setRgpdAccepted}
            label="J'ai pris connaissance de la politique de traitement des données ci-dessus (RGPD)." />
        </div>
      </Card>

      {/* Feedback + actions */}
      {feedback && (
        <div style={{
          ...body, fontSize: 13, padding: '12px 16px', marginBottom: 14,
          border: '1px solid ' + (feedback.kind === 'ok' ? '#1d6b3f' : LRH.red),
          color: feedback.kind === 'ok' ? '#1d6b3f' : LRH.red,
          background: feedback.kind === 'ok' ? 'rgba(29,107,63,0.06)' : 'rgba(168,32,47,0.06)',
        }}>{feedback.msg}</div>
      )}

      {!readOnly && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', position: 'sticky', bottom: 0, background: LRH.paper, padding: '14px 0' }}>
          <button type="button" onClick={runSaveDraft} disabled={pending} style={secondaryBtn(pending)}>
            {pending ? '…' : 'Enregistrer le brouillon'}
          </button>
          <button type="button" onClick={runSubmit} disabled={pending || submissionErrors.length > 0} style={primaryBtn(pending || submissionErrors.length > 0)}>
            {pending ? '…' : 'Soumettre à la Ligue'}
          </button>
          {submissionErrors.length > 0 && (
            <span style={{ ...mono, fontSize: 10.5, color: LRH.mute, alignSelf: 'center', letterSpacing: '0.06em' }}>
              {submissionErrors.length} champ{submissionErrors.length > 1 ? 's' : ''} requis avant soumission
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────
function EntryTable({ rows, data, onChange, disabled }: {
  rows: readonly { key: string; label: string }[];
  data: Record<string, { count: number; note: string }>;
  onChange: (key: string, field: 'count' | 'note', value: number | string) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {rows.map((r) => {
        const row = data[r.key] ?? { count: 0, note: '' };
        return (
          <div key={r.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) 80px minmax(0,1.6fr)', gap: 10, alignItems: 'center', borderBottom: '1px solid ' + LRH.hair, paddingBottom: 8 }}>
            <span style={{ ...body, fontSize: 13.5, color: LRH.ink, fontWeight: 600 }}>{r.label}</span>
            <input type="number" min={0} max={99} value={row.count} disabled={disabled}
              onChange={(e) => onChange(r.key, 'count', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
              aria-label={`Nombre d'équipes — ${r.label}`}
              style={{ ...inputStyle, textAlign: 'center', padding: '8px' }} />
            <input type="text" value={row.note} disabled={disabled} placeholder="Observations"
              onChange={(e) => onChange(r.key, 'note', e.target.value)}
              aria-label={`Observations — ${r.label}`}
              style={{ ...inputStyle, padding: '8px 10px' }} />
          </div>
        );
      })}
    </div>
  );
}

function RefereeTable({ referees, onChange, disabled }: {
  referees: EngagementRefereeRow[];
  onChange: (rows: EngagementRefereeRow[]) => void;
  disabled?: boolean;
}) {
  function update(i: number, field: keyof EngagementRefereeRow, v: string) {
    const next = referees.map((r, idx) => (idx === i ? { ...r, [field]: v } : r));
    onChange(next);
  }
  function add() {
    if (referees.length >= MAX_REFEREES) return;
    onChange([...referees, { lastName: '', firstName: '', level: '', phone: '' }]);
  }
  function remove(i: number) {
    onChange(referees.filter((_, idx) => idx !== i));
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {referees.length === 0 && (
        <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: 0 }}>Aucun arbitre déclaré.</p>
      )}
      {referees.map((r, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr)) auto', gap: 10, alignItems: 'end', borderBottom: '1px solid ' + LRH.hair, paddingBottom: 10 }}>
          <Field label="Nom" value={r.lastName} disabled={disabled} onChange={(v) => update(i, 'lastName', v)} />
          <Field label="Prénom" value={r.firstName} disabled={disabled} onChange={(v) => update(i, 'firstName', v)} />
          <Field label="Niveau / Diplôme" value={r.level} disabled={disabled} onChange={(v) => update(i, 'level', v)} />
          <Field label="Téléphone" type="tel" value={r.phone} disabled={disabled} onChange={(v) => update(i, 'phone', v)} />
          {!disabled && (
            <button type="button" onClick={() => remove(i)} aria-label="Retirer l'arbitre"
              style={{ ...mono, fontSize: 11, padding: '10px 12px', background: 'transparent', border: '1px solid ' + LRH.red, color: LRH.red, cursor: 'pointer', minHeight: 44 }}>
              Retirer
            </button>
          )}
        </div>
      ))}
      {!disabled && referees.length < MAX_REFEREES && (
        <button type="button" onClick={add} style={{ ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 16px', background: LRH.navy, color: '#fff', border: 'none', cursor: 'pointer', justifySelf: 'start', minHeight: 44 }}>
          + Ajouter un arbitre
        </button>
      )}
    </div>
  );
}

function StatusBanner({ status, rejectedReason, season }: { status: string; rejectedReason?: string | null; season: string }) {
  const config: Record<string, { bg: string; fg: string; label: string; msg: string }> = {
    DRAFT: { bg: 'rgba(243,188,28,0.12)', fg: LRH.navy, label: 'Brouillon', msg: `Fiche d'engagement saison ${season}. Complétez puis soumettez à la Ligue.` },
    SUBMITTED: { bg: 'rgba(0,34,68,0.06)', fg: LRH.navy, label: 'Soumise', msg: 'Votre fiche a été transmise à la Ligue. Elle est en cours de validation et ne peut plus être modifiée.' },
    VALIDATED: { bg: 'rgba(29,107,63,0.10)', fg: '#1d6b3f', label: 'Validée', msg: 'Votre engagement a été validé par la Ligue.' },
    REJECTED: { bg: 'rgba(168,32,47,0.08)', fg: LRH.red, label: 'À corriger', msg: rejectedReason ? `Motif du refus : ${rejectedReason}` : 'Votre fiche a été renvoyée pour correction.' },
  };
  const c = config[status] ?? config.DRAFT!;
  return (
    <div style={{ background: c.bg, borderLeft: '4px solid ' + c.fg, padding: '14px 18px', marginBottom: 22 }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: c.fg, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>
        ◉ {c.label}
      </div>
      <div style={{ ...body, fontSize: 13, color: LRH.ink }}>{c.msg}</div>
    </div>
  );
}

// ─── Styles boutons ──────────────────────────────────────────────────────
function toggleBtn(active: boolean): React.CSSProperties {
  return {
    ...body, fontSize: 13, fontWeight: 600, padding: '10px 14px', minHeight: 44,
    border: '1px solid ' + (active ? LRH.navy : LRH.hairStrong),
    background: active ? LRH.navy : '#fff', color: active ? '#fff' : LRH.ink,
    cursor: 'pointer', borderRadius: 4,
  };
}
function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
    padding: '14px 22px', minHeight: 48, border: 'none', borderRadius: 4,
    background: disabled ? LRH.mute : LRH.red, color: '#fff', cursor: disabled ? 'default' : 'pointer',
  };
}
function secondaryBtn(disabled: boolean): React.CSSProperties {
  return {
    ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700,
    padding: '14px 22px', minHeight: 48, borderRadius: 4,
    background: '#fff', color: LRH.navy, border: '1px solid ' + LRH.hairStrong,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
  };
}
