'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import {
  COMPETITION_ROWS,
  LEISURE_ROWS,
  WEEKDAYS,
  MAX_REFEREES,
  MAX_CLUB_ACTIONS,
  ENGAGEMENT_FEE_EUR,
  ENGAGEMENT_DEADLINE,
  getSubmissionErrors,
  type EngagementData,
  type Contact,
  type Facility,
  type ScheduleGrid,
  type EngagementRefereeRow,
  type ClubActionRow,
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

/** Choix binaire Oui / Non (valeur tri-état : true / false / null). */
function YesNo({ label, value, onChange, disabled }: { label: string; value: boolean | null; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ v: true, l: 'Oui' }, { v: false, l: 'Non' }].map((o) => (
          <button key={String(o.v)} type="button" disabled={disabled}
            onClick={() => onChange(o.v)}
            style={toggleBtn(value === o.v)}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

function ContactFields({ value, onChange, disabled }: {
  value: Contact; onChange: (c: Contact) => void; disabled?: boolean;
}) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={grid2}>
        <Field label="Nom & Prénom" value={value.name} onChange={(v) => onChange({ ...value, name: v })} disabled={disabled} />
        <Field label="Adresse mail" type="email" value={value.email} onChange={(v) => onChange({ ...value, email: v })} disabled={disabled} />
        <Field label="Téléphone" type="tel" value={value.phone} onChange={(v) => onChange({ ...value, phone: v })} disabled={disabled} />
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
  /** 'club' (défaut) : copie orientée club. 'admin' : lecture seule sans bannière. */
  audience?: 'club' | 'admin';
  /** Sauvegarde sans soumettre. Renvoie void ou throw (message d'erreur). */
  saveDraft: (data: EngagementData) => Promise<void>;
  /** Soumission finale à la ligue. */
  submit: (data: EngagementData, decl: {
    signedByName: string; signedCity: string; rgpdAccepted: boolean;
    declarationAccepted: boolean; paymentMethod: 'TRANSFER' | 'CHECK' | null;
  }) => Promise<void>;
};

const DEFAULT_RGPD =
  "Les informations recueillies sur ce formulaire sont enregistrées dans un fichier informatisé par la Ligue Réunionnaise de Hockey pour la gestion des compétitions, la communication officielle et le suivi administratif des clubs affiliés. Elles sont conservées pendant la durée de la saison sportive 2026/2027 et sont destinées exclusivement au comité directeur de la Ligue. Conformément à la loi « informatique et libertés », vous pouvez exercer votre droit d'accès aux données vous concernant et les faire rectifier en contactant la Ligue.";

const DECLARATION_TEXT =
  "Je soussigné(e), Président(e) du club, ayant reçu pouvoir de l'AG de mon association, déclare engager mon association aux compétitions de la Ligue Réunionnaise de Hockey sur Gazon pour la saison 2026/2027. Je certifie avoir pris connaissance des statuts et règlements de la Ligue et de la FFH, ainsi que des obligations inhérentes à la participation des équipes engagées. J'accepte les sanctions réglementaires y afférentes et m'engage, en cas de contestation, à respecter impérativement les seules voies de recours prévues par les dits règlements.";

export function EngagementForm({ initialData, initialDecl, status, rejectedReason, season, rgpdText, audience = 'club', saveDraft, submit }: EngagementFormProps) {
  const [data, setData] = useState<EngagementData>(initialData);
  const [signedByName, setSignedByName] = useState(initialDecl?.signedByName ?? '');
  const [signedCity, setSignedCity] = useState(initialDecl?.signedCity ?? initialData.general.city ?? '');
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CHECK' | null>(initialDecl?.paymentMethod ?? null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [rgpdAccepted, setRgpdAccepted] = useState(false);

  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);

  // Admin = consultation seule (la décision se prend dans le panneau dédié).
  // Côté club, la fiche se verrouille dès qu'elle est soumise/validée.
  const readOnly = audience === 'admin' || status === 'SUBMITTED' || status === 'VALIDATED';

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
      {audience === 'club' && <StatusBanner status={status} rejectedReason={rejectedReason} season={season} />}

      {/* SECTION 1 — Identification du club */}
      <Card>
        <SectionHeader num="01" kicker="Identification" title="Identification du club." />
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={grid2}>
            <Field label="Nom du club" value={data.general.clubName} disabled={readOnly} onChange={(v) => patch((d) => { d.general.clubName = v; })} />
            <Field label="Ville" value={data.general.city} disabled={readOnly} onChange={(v) => patch((d) => { d.general.city = v; })} />
          </div>
          <div style={grid2}>
            <YesNo label="Affiliation FFH 2026" value={data.general.ffhAffiliated} disabled={readOnly} onChange={(v) => patch((d) => { d.general.ffhAffiliated = v; })} />
            <YesNo label="Affiliation Ligue 2026" value={data.general.ligueAffiliated} disabled={readOnly} onChange={(v) => patch((d) => { d.general.ligueAffiliated = v; })} />
          </div>
          <div>
            <CheckRow label="Entente avec un autre club" checked={data.general.entente.active} disabled={readOnly} onChange={(v) => patch((d) => { d.general.entente.active = v; })} />
            {data.general.entente.active && (
              <Field label="Nom du club partenaire" value={data.general.entente.partnerName} disabled={readOnly} onChange={(v) => patch((d) => { d.general.entente.partnerName = v; })} />
            )}
          </div>

          <div style={{ marginTop: 8 }}>
            <SubLabel>Couleurs des tenues séniors (Gazon et Salle)</SubLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
              {([['first', '1ère couleur'], ['second', '2nd couleur']] as const).map(([side, sideLabel]) => (
                <div key={side} style={{ border: '1px solid ' + LRH.hair, padding: 14 }}>
                  <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                    {sideLabel}
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <Field label="Maillot" value={data.general.kit[side].jersey} disabled={readOnly} onChange={(v) => patch((d) => { d.general.kit[side].jersey = v; })} />
                    <Field label="Short" value={data.general.kit[side].shorts} disabled={readOnly} onChange={(v) => patch((d) => { d.general.kit[side].shorts = v; })} />
                    <Field label="Bas" value={data.general.kit[side].socks} disabled={readOnly} onChange={(v) => patch((d) => { d.general.kit[side].socks = v; })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* SECTION 2 — Contact officiel du club */}
      <Card>
        <SectionHeader num="02" kicker="Contacts" title="Contact officiel du club." />
        <div style={{ display: 'grid', gap: 22 }}>
          {([
            ['president', 'Président'],
            ['seniorCompetitions', 'Responsable des compétitions séniors'],
            ['youthCompetitions', 'Responsable des compétitions jeunes'],
            ['refereeManager', "Responsable de l'arbitrage au sein du club"],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <SubLabel>{label}</SubLabel>
              <ContactFields
                value={data.contacts[key]}
                disabled={readOnly}
                onChange={(c) => patch((d) => { d.contacts[key] = c; })}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* SECTION 3 — Infrastructures et créneaux */}
      <Card>
        <SectionHeader num="03" kicker="Infrastructures" title="Infrastructures et créneaux." desc="Installation sportive principale par discipline, puis créneaux hebdomadaires." />
        <div style={{ display: 'grid', gap: 22 }}>
          <FacilityFields
            label="Salle"
            value={data.infrastructure.salle}
            withScoreboard
            disabled={readOnly}
            onChange={(f) => patch((d) => { d.infrastructure.salle = f; })}
          />
          <FacilityFields
            label="Gazon"
            value={data.infrastructure.gazon}
            disabled={readOnly}
            onChange={(f) => patch((d) => { d.infrastructure.gazon = f; })}
          />

          <div>
            <SubLabel>Créneaux — Séniors</SubLabel>
            <ScheduleGridEditor
              value={data.infrastructure.schedules.seniors}
              disabled={readOnly}
              onChange={(g) => patch((d) => { d.infrastructure.schedules.seniors = g; })}
            />
          </div>
          <div>
            <SubLabel>Créneaux — Jeunes</SubLabel>
            <ScheduleGridEditor
              value={data.infrastructure.schedules.youth}
              disabled={readOnly}
              onChange={(g) => patch((d) => { d.infrastructure.schedules.youth = g; })}
            />
          </div>
        </div>
      </Card>

      {/* SECTION 4 — Engagement compétitions */}
      <Card>
        <SectionHeader num="04" kicker="Compétitions" title="Engagement compétitions 2026/2027." desc="Indiquez le nombre d'équipes engagées par catégorie (0 = pas d'engagement)." />
        <EntryTable rows={COMPETITION_ROWS} data={data.competitions} disabled={readOnly} onChange={(key, field, value) => patch((d) => { (d.competitions[key] as any)[field] = value; })} />
      </Card>

      {/* SECTION 5 — Loisirs et événements */}
      <Card>
        <SectionHeader num="05" kicker="Loisirs & événements" title="Engagement loisirs et événements." />
        <EntryTable rows={LEISURE_ROWS} data={data.leisure} disabled={readOnly} onChange={(key, field, value) => patch((d) => { (d.leisure[key] as any)[field] = value; })} />
        <div style={{ marginTop: 22 }}>
          <SubLabel>Actions clubs</SubLabel>
          <ClubActionTable actions={data.clubActions} disabled={readOnly} onChange={(rows) => patch((d) => { d.clubActions = rows; })} />
        </div>
      </Card>

      {/* SECTION 6 — Engagement arbitres séniors */}
      <Card>
        <SectionHeader num="06" kicker="Arbitrage" title="Engagement arbitres séniors." desc="Obligation réglementaire selon le niveau d'engagement du club." />
        <RefereeTable referees={data.referees} disabled={readOnly}
          onChange={(rows) => patch((d) => { d.referees = rows; })} />
      </Card>

      {/* SECTION 7 — Règlement et déclaration */}
      <Card>
        <SectionHeader num="07" kicker="Validation" title="Règlement et déclaration." desc={`Frais d'engagement : ${ENGAGEMENT_FEE_EUR} € · Date limite : ${ENGAGEMENT_DEADLINE}.`} />
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <SubLabel>Mode de règlement</SubLabel>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" disabled={readOnly} onClick={() => setPaymentMethod('CHECK')} style={toggleBtn(paymentMethod === 'CHECK')}>Chèque</button>
              <button type="button" disabled={readOnly} onClick={() => setPaymentMethod('TRANSFER')} style={toggleBtn(paymentMethod === 'TRANSFER')}>Virement bancaire</button>
            </div>
            <p style={{ ...body, fontSize: 12, color: LRH.mute, margin: '8px 0 0', lineHeight: 1.6 }}>
              {paymentMethod === 'CHECK'
                ? "Chèque à l'ordre de la Ligue Réunionnaise de Hockey sur Gazon."
                : paymentMethod === 'TRANSFER'
                ? 'Pour un virement, demandez le RIB directement à la Ligue et précisez le nom du club en libellé.'
                : "Chèque à l'ordre de la Ligue Réunionnaise de Hockey sur Gazon, ou virement bancaire (RIB sur demande, nom du club en libellé)."}
            </p>
          </div>

          {/* Déclaration sur l'honneur */}
          <div style={{ background: LRH.paperWarm, border: '1px solid ' + LRH.hair, padding: 14 }}>
            <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.navy, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Déclaration sur l'honneur
            </div>
            <p style={{ ...body, fontSize: 12.5, color: LRH.ink, margin: 0, lineHeight: 1.7 }}>{DECLARATION_TEXT}</p>
          </div>

          {/* RGPD */}
          <div style={{ background: LRH.paperWarm, border: '1px solid ' + LRH.hair, padding: 14 }}>
            <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.navy, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              Protection des données (RGPD)
            </div>
            <p style={{ ...body, fontSize: 11.5, color: LRH.mute, margin: 0, lineHeight: 1.6 }}>{rgpdText ?? DEFAULT_RGPD}</p>
          </div>

          <div style={grid2}>
            <Field label="Fait à (lieu)" value={signedCity} disabled={readOnly} onChange={setSignedCity} />
            <Field label="Nom du/de la président(e) signataire" value={signedByName} disabled={readOnly} onChange={setSignedByName} />
          </div>

          <CheckRow disabled={readOnly} checked={declarationAccepted} onChange={setDeclarationAccepted}
            label="Je certifie sur l'honneur l'exactitude des informations et accepte la déclaration ci-dessus." />
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
function FacilityFields({ label, value, onChange, withScoreboard, disabled }: {
  label: string; value: Facility; onChange: (f: Facility) => void; withScoreboard?: boolean; disabled?: boolean;
}) {
  return (
    <div style={{ border: '1px solid ' + LRH.hair, borderLeft: '3px solid ' + LRH.gold, padding: 14 }}>
      <SubLabel>{label}</SubLabel>
      <div style={{ display: 'grid', gap: 12 }}>
        <Field label="Nom de l'infrastructure" value={value.name} disabled={disabled} onChange={(v) => onChange({ ...value, name: v })} />
        <Field label="Adresse" value={value.address} disabled={disabled} onChange={(v) => onChange({ ...value, address: v })} />
        <div>
          <CheckRow label="Vestiaire joueurs" checked={value.playerLockers} disabled={disabled} onChange={(v) => onChange({ ...value, playerLockers: v })} />
          <CheckRow label="Vestiaire arbitre" checked={value.refereeLockers} disabled={disabled} onChange={(v) => onChange({ ...value, refereeLockers: v })} />
          {withScoreboard && (
            <CheckRow label="Tableau de marquage électronique" checked={value.scoreboard} disabled={disabled} onChange={(v) => onChange({ ...value, scoreboard: v })} />
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleGridEditor({ value, onChange, disabled }: {
  value: ScheduleGrid; onChange: (g: ScheduleGrid) => void; disabled?: boolean;
}) {
  const rows: { key: 'match' | 'training'; label: string }[] = [
    { key: 'match', label: 'Match' },
    { key: 'training', label: 'Entraînement' },
  ];
  const cellStyle: React.CSSProperties = { ...inputStyle, padding: '7px 8px', fontSize: 13, textAlign: 'center' };
  return (
    <div style={{ overflowX: 'auto', border: '1px solid ' + LRH.hair }}>
      <table style={{ borderCollapse: 'collapse', minWidth: 760, width: '100%' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left', minWidth: 110 }}>Activité</th>
            {WEEKDAYS.map((d) => (
              <th key={d.key} style={thStyle}>{d.short}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td style={{ ...tdStyle, ...body, fontSize: 12.5, fontWeight: 700, color: LRH.navy, textAlign: 'left' }}>{r.label}</td>
              {WEEKDAYS.map((d) => (
                <td key={d.key} style={tdStyle}>
                  <input
                    type="text"
                    value={value[r.key][d.key]}
                    disabled={disabled}
                    placeholder="—"
                    aria-label={`${r.label} ${d.label}`}
                    onChange={(e) => {
                      const next: ScheduleGrid = { match: { ...value.match }, training: { ...value.training } };
                      next[r.key][d.key] = e.target.value;
                      onChange(next);
                    }}
                    style={{ ...cellStyle, minWidth: 78 }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase',
  padding: '8px 6px', borderBottom: '1px solid ' + LRH.hairStrong, background: LRH.paperWarm, textAlign: 'center',
};
const tdStyle: React.CSSProperties = { padding: 4, borderBottom: '1px solid ' + LRH.hair, textAlign: 'center' };

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
          <div key={r.key} className="lrh-engage-entry-row" style={{ borderBottom: '1px solid ' + LRH.hair, paddingBottom: 8 }}>
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

function ClubActionTable({ actions, onChange, disabled }: {
  actions: ClubActionRow[];
  onChange: (rows: ClubActionRow[]) => void;
  disabled?: boolean;
}) {
  function update(i: number, field: keyof ClubActionRow, v: string) {
    onChange(actions.map((a, idx) => (idx === i ? { ...a, [field]: v } : a)));
  }
  function add() {
    if (actions.length >= MAX_CLUB_ACTIONS) return;
    onChange([...actions, { type: '', date: '', note: '' }]);
  }
  function remove(i: number) {
    onChange(actions.filter((_, idx) => idx !== i));
  }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {actions.length === 0 && (
        <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: 0 }}>Aucune action déclarée.</p>
      )}
      {actions.map((a, i) => (
        <div key={i} className="lrh-engage-action-row" style={{ borderBottom: '1px solid ' + LRH.hair, paddingBottom: 10 }}>
          <Field label="Type d'action" value={a.type} disabled={disabled} onChange={(v) => update(i, 'type', v)} />
          <Field label="Date" value={a.date} disabled={disabled} onChange={(v) => update(i, 'date', v)} placeholder="ex : 12/10/2026" />
          <Field label="Observations" value={a.note} disabled={disabled} onChange={(v) => update(i, 'note', v)} />
          {!disabled && (
            <button type="button" onClick={() => remove(i)} aria-label="Retirer l'action"
              style={{ ...mono, fontSize: 11, padding: '10px 12px', background: 'transparent', border: '1px solid ' + LRH.red, color: LRH.red, cursor: 'pointer', minHeight: 44 }}>
              Retirer
            </button>
          )}
        </div>
      ))}
      {!disabled && actions.length < MAX_CLUB_ACTIONS && (
        <button type="button" onClick={add} style={{ ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '10px 16px', background: LRH.navy, color: '#fff', border: 'none', cursor: 'pointer', justifySelf: 'start', minHeight: 44 }}>
          + Ajouter une action
        </button>
      )}
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
    onChange([...referees, { lastName: '', firstName: '', phone: '', level: '', note: '' }]);
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
        <div key={i} className="lrh-engage-ref-row" style={{ borderBottom: '1px solid ' + LRH.hair, paddingBottom: 10 }}>
          <Field label="Nom" value={r.lastName} disabled={disabled} onChange={(v) => update(i, 'lastName', v)} />
          <Field label="Prénom" value={r.firstName} disabled={disabled} onChange={(v) => update(i, 'firstName', v)} />
          <Field label="Téléphone" type="tel" value={r.phone} disabled={disabled} onChange={(v) => update(i, 'phone', v)} />
          <Field label="Formation" value={r.level} disabled={disabled} onChange={(v) => update(i, 'level', v)} />
          <Field label="Observations" value={r.note} disabled={disabled} onChange={(v) => update(i, 'note', v)} />
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
