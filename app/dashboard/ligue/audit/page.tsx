import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listAuditEntries, type AuditEntry } from '@/lib/audit';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { Paginator, paginate } from '@/components/lrh/sections';

const PAGE_SIZE = 50;

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  DELETE_MATCH:             { label: 'Suppression match',           color: LRH.red },
  DELETE_COMPETITION:       { label: 'Suppression compétition',     color: LRH.red },
  DELETE_GOAL:              { label: 'Suppression but',             color: LRH.red },
  DELETE_CARD:              { label: 'Suppression carton',          color: LRH.red },
  DELETE_INJURY:            { label: 'Suppression blessure',        color: LRH.red },
  CREATE_MATCHDAY:          { label: 'Création journée (batch)',    color: LRH.gold },
  FINALIZE_MATCH:           { label: 'Officialisation match',       color: LRH.navy },
  EDIT_FINISHED_SCORE:      { label: 'Correction score officiel',   color: LRH.red },
  REMOVE_COMPETITION_ENTRY: { label: 'Désinscription club',         color: LRH.red },
};

function actionPalette(action: string) {
  return ACTION_LABEL[action] ?? { label: action, color: LRH.mute };
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ padding: 48 }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ⚠ Accès réservé
        </div>
        <div style={{ ...display, fontSize: 20, color: LRH.navy, marginTop: 8 }}>
          Le journal d'audit est réservé aux administrateurs de la ligue.
        </div>
      </div>
    );
  }

  const { page, entity } = await searchParams;
  const club = user?.club ?? null;

  // Compte initial pour calculer la pagination
  const initial = await listAuditEntries({ take: 1, entity });
  const { currentPage, totalPages, skip, take } = paginate({
    page, pageSize: PAGE_SIZE, total: initial.total,
  });
  const { rows, total } = await listAuditEntries({ skip, take, entity });

  const [metrics, news] = await Promise.all([
    club ? getClubMetrics(club.id) : Promise.resolve({ newsCount: 0, membersCount: 0, sponsorsCount: 0 }),
    club ? getNews(club.id) : Promise.resolve([]),
  ]);

  const hrefBuilder = (p: number) => {
    const params = new URLSearchParams();
    if (entity) params.set('entity', entity);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/dashboard/ligue/audit?${qs}` : '/dashboard/ligue/audit';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop
        club={club}
        news={news}
        metrics={metrics}
        user={session.user}
        activeTab="ligue-audit"
        isAdmin
      >
        <div style={{ padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Sécurité · Traçabilité
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 32, color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Journal d'audit.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Historique des actions sensibles (suppressions, officialisations, créations batch). Conservé en base
              indépendamment des entités supprimées. Utile en cas de contestation.
            </p>
          </div>

          {rows.length === 0 ? (
            <div style={{
              padding: 24, background: '#fff',
              border: '1px dashed ' + LRH.hairStrong, ...mono,
              fontSize: 12, color: LRH.mute, letterSpacing: '0.08em',
              textAlign: 'center',
            }}>
              Aucune action enregistrée pour l'instant.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: LRH.hair, border: '1px solid ' + LRH.hairStrong }}>
              {rows.map((row) => (
                <AuditRow key={row.id} entry={row} />
              ))}
            </div>
          )}

          <Paginator
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            hrefBuilder={hrefBuilder}
            itemLabel="événement"
          />
        </div>
      </HomeDashboardDesktop>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const pal = actionPalette(entry.action);
  const date = new Date(entry.createdAt);
  const dateLabel = date.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const meta = (entry.metadata ?? null) as Record<string, unknown> | null;
  const summary = typeof meta?.summary === 'string' ? meta.summary : null;
  const competitionLabel = typeof meta?.competitionLabel === 'string' ? meta.competitionLabel : null;
  const matchCount = typeof meta?.matchCount === 'number' ? meta.matchCount : null;
  const matchday = typeof meta?.matchday === 'number' ? meta.matchday : null;
  const clubLabel = typeof meta?.clubLabel === 'string' ? meta.clubLabel : null;
  const newScore = typeof meta?.newScore === 'string' ? meta.newScore : null;

  const detail = summary
    ?? clubLabel
    ?? (competitionLabel ? `${competitionLabel}${matchday ? ` · J${matchday}` : ''}${matchCount ? ` · ${matchCount} matchs` : ''}` : null)
    ?? (newScore ? `Score : ${newScore}` : null)
    ?? `${entry.entity}${entry.entityId ? ` #${entry.entityId.slice(-6)}` : ''}`;

  return (
    <div
      style={{
        background: '#fff',
        padding: '12px 14px',
        display: 'grid',
        gridTemplateColumns: '170px 220px 1fr 130px',
        gap: 14,
        alignItems: 'center',
        borderLeft: `3px solid ${pal.color}`,
      }}
    >
      <div>
        <div style={{
          ...mono, fontSize: 9, fontWeight: 800,
          color: pal.color, letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          {pal.label}
        </div>
        <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.08em', marginTop: 3 }}>
          {entry.entity}
        </div>
      </div>
      <div>
        <div style={{ ...body, fontSize: 12.5, fontWeight: 700, color: LRH.navy }}>
          {entry.userName || entry.userEmail || 'Inconnu'}
        </div>
        <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.06em', marginTop: 2 }}>
          {entry.userEmail ?? '—'} {entry.ip ? `· ${entry.ip}` : ''}
        </div>
      </div>
      <div style={{
        ...body, fontSize: 12.5, color: LRH.ink2, lineHeight: 1.5,
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {detail}
      </div>
      <div style={{
        ...mono, fontSize: 10.5, fontWeight: 600,
        color: LRH.mute, letterSpacing: '0.08em',
        textAlign: 'right',
      }}>
        {dateLabel}
      </div>
    </div>
  );
}
