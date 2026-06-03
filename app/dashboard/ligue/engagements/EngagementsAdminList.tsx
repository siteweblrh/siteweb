'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { formatReunionDate } from '@/lib/utils/datetime-reunion';
import type { EngagementStatus, EngagementPaymentStatus } from '@prisma/client';

type Row = {
  id: string;
  season: string;
  status: EngagementStatus;
  paymentStatus: EngagementPaymentStatus;
  submittedAt: Date | string | null;
  signedByName: string | null;
  club: { id: string; name: string; shortCode: string | null; city: string };
};

const STATUS_META: Record<EngagementStatus, { label: string; bg: string; fg: string }> = {
  DRAFT: { label: 'Brouillon', bg: 'rgba(0,34,68,0.06)', fg: LRH.mute },
  SUBMITTED: { label: 'À traiter', bg: 'rgba(243,188,28,0.18)', fg: LRH.navy },
  VALIDATED: { label: 'Validée', bg: 'rgba(29,107,63,0.12)', fg: '#1d6b3f' },
  REJECTED: { label: 'Refusée', bg: 'rgba(168,32,47,0.10)', fg: LRH.red },
};

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 9px', background: bg, color: fg, borderRadius: 2, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

export function EngagementsAdminList({ engagements, activeStatus, activePayment }: {
  engagements: Row[];
  activeStatus: EngagementStatus | null;
  activePayment: EngagementPaymentStatus | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setFilter(key: 'status' | 'payment', value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.push(`/dashboard/ligue/engagements${next.toString() ? '?' + next.toString() : ''}`);
  }

  const statusChips: { v: EngagementStatus | null; l: string }[] = [
    { v: null, l: 'Toutes' },
    { v: 'SUBMITTED', l: 'À traiter' },
    { v: 'VALIDATED', l: 'Validées' },
    { v: 'REJECTED', l: 'Refusées' },
  ];
  const payChips: { v: EngagementPaymentStatus | null; l: string }[] = [
    { v: null, l: 'Tous paiements' },
    { v: 'PENDING', l: 'En attente' },
    { v: 'PAID', l: 'Payé' },
  ];

  return (
    <div>
      {/* Filtres */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {statusChips.map((c) => (
            <Chip key={c.l} active={activeStatus === c.v} onClick={() => setFilter('status', c.v)}>{c.l}</Chip>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {payChips.map((c) => (
            <Chip key={c.l} active={activePayment === c.v} onClick={() => setFilter('payment', c.v)}>{c.l}</Chip>
          ))}
        </div>
      </div>

      {engagements.length === 0 ? (
        <div style={{ ...body, fontSize: 14, color: LRH.mute, padding: '40px 0', textAlign: 'center', border: '1px dashed ' + LRH.hairStrong }}>
          Aucune fiche d'engagement pour ces filtres.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {engagements.map((e) => {
            const sm = STATUS_META[e.status];
            const paid = e.paymentStatus === 'PAID';
            return (
              <Link key={e.id} href={`/dashboard/ligue/engagements/${e.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 14, alignItems: 'center',
                  background: '#fff', border: '1px solid ' + LRH.hair,
                  borderLeft: '3px solid ' + sm.fg, padding: '14px 16px',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...display, fontWeight: 700, fontSize: 15, color: LRH.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.club.name}
                    </div>
                    <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.06em', marginTop: 3 }}>
                      {e.club.city} · Saison {e.season}
                      {e.submittedAt ? ` · soumise le ${formatReunionDate(new Date(e.submittedAt))}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Badge label={sm.label} bg={sm.bg} fg={sm.fg} />
                    <Badge label={paid ? 'Payé' : 'À régler'} bg={paid ? 'rgba(29,107,63,0.12)' : 'rgba(168,32,47,0.10)'} fg={paid ? '#1d6b3f' : LRH.red} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      ...mono, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '8px 14px', minHeight: 40, cursor: 'pointer', borderRadius: 2,
      border: '1px solid ' + (active ? LRH.navy : LRH.hairStrong),
      background: active ? LRH.navy : '#fff', color: active ? '#fff' : LRH.mute,
    }}>{children}</button>
  );
}
