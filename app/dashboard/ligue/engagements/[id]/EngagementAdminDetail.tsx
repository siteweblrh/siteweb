'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { EngagementForm } from '@/components/lrh/engagement/EngagementForm';
import { validateEngagement, rejectEngagement, setEngagementPayment } from '@/lib/actions/engagement';
import { formatReunionDate } from '@/lib/utils/datetime-reunion';
import { ENGAGEMENT_FEE_EUR, type EngagementData } from '@/lib/engagement/schema';
import type { EngagementStatus, EngagementPaymentStatus, EngagementPaymentMethod } from '@prisma/client';

type Props = {
  id: string;
  season: string;
  status: EngagementStatus;
  paymentStatus: EngagementPaymentStatus;
  paymentMethod: EngagementPaymentMethod | null;
  rejectedReason: string | null;
  signedByName: string | null;
  signedCity: string | null;
  signedAt: string | null;
  submittedByEmail: string | null;
  validatedByEmail: string | null;
  data: EngagementData;
};

const noop = async () => {};

export function EngagementAdminDetail(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur.');
      }
    });
  }

  const paid = props.paymentStatus === 'PAID';
  const methodLabel = props.paymentMethod === 'TRANSFER' ? 'Virement' : props.paymentMethod === 'CHECK' ? 'Chèque' : '—';

  return (
    <div style={{ maxWidth: 920 }}>
      {/* Panneau de décision admin */}
      <div style={{ background: '#fff', border: '1px solid ' + LRH.hairStrong, borderTop: '4px solid ' + LRH.gold, padding: 'clamp(16px, 3vw, 22px)', marginBottom: 22 }}>
        <div style={{ ...mono, fontSize: 10.5, fontWeight: 700, color: LRH.red, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>
          Décision Ligue
        </div>

        {/* Méta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 18 }}>
          <Meta label="Statut" value={statusLabel(props.status)} />
          <Meta label="Signataire" value={props.signedByName || '—'} />
          <Meta label="Fait à / le" value={props.signedCity ? `${props.signedCity}${props.signedAt ? ' · ' + formatReunionDate(props.signedAt) : ''}` : '—'} />
          <Meta label="Soumise par" value={props.submittedByEmail || '—'} />
          <Meta label="Règlement" value={`${ENGAGEMENT_FEE_EUR} € · ${methodLabel}`} />
          {props.validatedByEmail && <Meta label="Traitée par" value={props.validatedByEmail} />}
        </div>

        {props.status === 'REJECTED' && props.rejectedReason && (
          <div style={{ ...body, fontSize: 13, color: LRH.red, background: 'rgba(168,32,47,0.06)', borderLeft: '3px solid ' + LRH.red, padding: '10px 14px', marginBottom: 16 }}>
            Motif du refus : {props.rejectedReason}
          </div>
        )}

        {/* Actions validation/refus — uniquement si soumise */}
        {props.status === 'SUBMITTED' && (
          <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" disabled={pending} onClick={() => run(() => validateEngagement(props.id))}
                style={btn(LRH.navy, '#fff', pending)}>✓ Valider la fiche</button>
              <button type="button" disabled={pending} onClick={() => setShowReject((v) => !v)}
                style={btn('#fff', LRH.red, pending, LRH.red)}>✕ Refuser</button>
            </div>
            {showReject && (
              <div style={{ display: 'grid', gap: 8 }}>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif du refus (transmis au club)…"
                  style={{ ...body, fontSize: 13, padding: '10px 12px', border: '1px solid ' + LRH.hairStrong, borderRadius: 4, minHeight: 80, resize: 'vertical' }} />
                <button type="button" disabled={pending || !reason.trim()} onClick={() => run(() => rejectEngagement(props.id, reason))}
                  style={btn(LRH.red, '#fff', pending || !reason.trim())}>Confirmer le refus</button>
              </div>
            )}
          </div>
        )}

        {/* Suivi paiement — disponible dès soumission */}
        <div style={{ borderTop: '1px dashed ' + LRH.hairStrong, paddingTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Paiement :</span>
          <span style={{ ...display, fontWeight: 700, fontSize: 14, color: paid ? '#1d6b3f' : LRH.red }}>{paid ? 'Reçu' : 'En attente'}</span>
          <button type="button" disabled={pending}
            onClick={() => run(() => setEngagementPayment(props.id, paid ? 'PENDING' : 'PAID'))}
            style={btn('#fff', LRH.navy, pending, LRH.hairStrong)}>
            {paid ? 'Marquer en attente' : 'Marquer comme payé'}
          </button>
        </div>

        {error && <div style={{ ...body, fontSize: 13, color: LRH.red, marginTop: 14 }}>{error}</div>}
      </div>

      {/* Snapshot complet en lecture seule */}
      <EngagementForm
        audience="admin"
        season={props.season}
        status={props.status}
        rejectedReason={props.rejectedReason}
        initialData={props.data}
        initialDecl={{ signedByName: props.signedByName ?? '', signedCity: props.signedCity ?? '', paymentMethod: props.paymentMethod }}
        saveDraft={noop}
        submit={noop}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ ...body, fontSize: 13, color: LRH.ink, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

function statusLabel(s: EngagementStatus): string {
  return s === 'SUBMITTED' ? 'À traiter' : s === 'VALIDATED' ? 'Validée' : s === 'REJECTED' ? 'Refusée' : 'Brouillon';
}

function btn(bg: string, fg: string, disabled: boolean, border?: string): React.CSSProperties {
  return {
    ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '12px 18px', minHeight: 46, borderRadius: 4, cursor: disabled ? 'default' : 'pointer',
    background: bg, color: fg, border: '1px solid ' + (border ?? bg), opacity: disabled ? 0.55 : 1,
  };
}
