import React from 'react';
import Link from 'next/link';
import { listAuditEntries, getAuditActionFacets, type AuditEntry } from '@/lib/audit';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { HomeDashboardDesktop } from '@/components/lrh/DashboardDesktop';
import { Paginator } from '@/components/lrh/sections';
import { paginate } from '@/lib/utils/paginate';
import { getDashboardContext } from '@/lib/dashboard/context';

const PAGE_SIZE = 25;

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

/**
 * Barre de filtres par type d'action. Chips = liens URL (?action=…), donc
 * aucun JS client nécessaire. Affiche uniquement les actions présentes en
 * base avec leur compteur. Sélectionner un filtre repart en page 1.
 */
function FilterBar({
  facets,
  totalAll,
  active,
}: {
  facets: { action: string; count: number }[];
  totalAll: number;
  active?: string;
}) {
  if (facets.length === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 'clamp(16px, 2.5vw, 24px)',
        paddingBottom: 16,
        borderBottom: '1px dashed ' + LRH.hairStrong,
      }}
    >
      <FilterChip href="/dashboard/ligue/audit" label="Tous" count={totalAll} active={!active} />
      {facets.map((f) => {
        const pal = actionPalette(f.action);
        return (
          <FilterChip
            key={f.action}
            href={`/dashboard/ligue/audit?action=${encodeURIComponent(f.action)}`}
            label={pal.label}
            count={f.count}
            accent={pal.color}
            active={active === f.action}
          />
        );
      })}
    </div>
  );
}

function FilterChip({
  href,
  label,
  count,
  accent,
  active,
}: {
  href: string;
  label: string;
  count: number;
  accent?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        ...mono,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        padding: '7px 12px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: active ? LRH.navy : '#fff',
        color: active ? '#fff' : LRH.navy,
        border: '1px solid ' + (active ? LRH.navy : LRH.hairStrong),
        borderLeft: accent ? `3px solid ${accent}` : undefined,
      }}
    >
      {label}
      <span
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 700,
          color: active ? LRH.gold : LRH.mute,
        }}
      >
        {count}
      </span>
    </Link>
  );
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  // Context + searchParams + count filtré + facettes en parallèle.
  // La liste paginée dépend du count, donc séquentielle ensuite.
  const [ctx, { page, action }, initial, facets] = await Promise.all([
    getDashboardContext({ requireAdmin: true }),
    searchParams,
    // Compte filtré par l'action courante (sert à dimensionner la pagination).
    (async () => {
      const sp = await searchParams;
      return listAuditEntries({ take: 1, action: sp.action });
    })(),
    getAuditActionFacets(),
  ]);
  const { currentPage, totalPages, skip, take } = paginate({
    page, pageSize: PAGE_SIZE, total: initial.total,
  });
  const { rows, total } = await listAuditEntries({ skip, take, action });
  const { sidebarProps } = ctx;
  const totalAll = facets.reduce((sum, f) => sum + f.count, 0);

  return (
    <div style={{ display: 'flex', height: '100vh', background: LRH.paper }}>
      <HomeDashboardDesktop {...sidebarProps} activeTab="ligue-audit">
        <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
          <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
            }}>
              Sécurité · Traçabilité
            </div>
            <h2 style={{
              ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              Journal d'audit.
            </h2>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
              Historique des actions sensibles (suppressions, officialisations, créations batch). Conservé en base
              indépendamment des entités supprimées. Utile en cas de contestation.
            </p>
          </div>

          <FilterBar facets={facets} totalAll={totalAll} active={action} />

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
            hrefBase="/dashboard/ligue/audit"
            hrefParams={action ? { action } : undefined}
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

  // Layout responsive : 4 colonnes en desktop, empilé en mobile via
  // CSS class (les media queries inline ne sont pas possibles).
  return (
    <div
      className="lrh-audit-row"
      style={{
        background: '#fff',
        padding: '14px 16px',
        borderLeft: `3px solid ${pal.color}`,
      }}
    >
      <div className="lrh-audit-action">
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
      <div className="lrh-audit-user">
        <div style={{ ...body, fontSize: 12.5, fontWeight: 700, color: LRH.navy }}>
          {entry.userName || entry.userEmail || 'Inconnu'}
        </div>
        <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.06em', marginTop: 2, wordBreak: 'break-all' }}>
          {entry.userEmail ?? '—'} {entry.ip ? `· ${entry.ip}` : ''}
        </div>
      </div>
      <div
        className="lrh-audit-detail"
        style={{ ...body, fontSize: 12.5, color: LRH.ink2, lineHeight: 1.5 }}
      >
        {detail}
      </div>
      <div className="lrh-audit-date" style={{
        ...mono, fontSize: 10.5, fontWeight: 600,
        color: LRH.mute, letterSpacing: '0.08em',
      }}>
        {dateLabel}
      </div>
    </div>
  );
}
