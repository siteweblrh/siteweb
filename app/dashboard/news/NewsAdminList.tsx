'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { Paginator } from '@/components/lrh/sections';
import { deleteNews, updateNews, submitForReview, approveArticle, rejectArticle } from '@/lib/actions/news';

type ArticleData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  category: string;
  published: boolean;
  publishedAt: Date | null;
  status: string;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string | null; email: string | null } | null;
  club: { name: string; shortCode: string | null } | null;
};

type OptimisticPatch =
  | { kind: 'toggle-publish'; id: string; nextPublished: boolean }
  | { kind: 'delete'; id: string }
  | { kind: 'status'; id: string; status: string };

function applyOptimistic(state: ArticleData[], patch: OptimisticPatch): ArticleData[] {
  if (patch.kind === 'delete') {
    return state.filter((a) => a.id !== patch.id);
  }
  if (patch.kind === 'status') {
    return state.map((a) =>
      a.id === patch.id ? { ...a, status: patch.status } : a,
    );
  }
  return state.map((a) =>
    a.id === patch.id
      ? { ...a, published: patch.nextPublished, publishedAt: patch.nextPublished ? new Date() : a.publishedAt }
      : a,
  );
}

const CATEGORY_LABEL: Record<string, { label: string; color: string }> = {
  ACTUALITE:  { label: 'Actualité',  color: LRH.navy },
  RESULTAT:   { label: 'Résultat',   color: '#1d6b3f' },
  EVENEMENT:  { label: 'Événement',  color: LRH.gold },
  COMMUNIQUE: { label: 'Communiqué', color: LRH.red },
};

const STATUS_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  DRAFT:    { label: 'Brouillon',    bg: LRH.hairStrong, fg: LRH.mute },
  PENDING:  { label: 'En attente',   bg: '#F59E0B',      fg: '#fff' },
  APPROVED: { label: 'Approuvé',     bg: '#1d6b3f',      fg: '#fff' },
  REJECTED: { label: 'Refusé',       bg: LRH.red,        fg: '#fff' },
};

export function NewsAdminList({
  articles,
  isAdmin,
  pagination,
}: {
  articles: ArticleData[];
  isAdmin: boolean;
  pagination: { currentPage: number; totalPages: number; totalItems: number };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimistic, applyPatch] = useOptimistic(articles, applyOptimistic);

  const onTogglePublish = (a: ArticleData) => {
    if (!isAdmin) return;
    const nextPublished = !a.published;
    setError(null);
    startTransition(async () => {
      applyPatch({ kind: 'toggle-publish', id: a.id, nextPublished });
      try {
        await updateNews(a.id, { published: nextPublished });
        router.refresh();
      } catch (e: any) {
        setError(e?.message || 'Erreur lors de la mise à jour');
        router.refresh();
      }
    });
  };

  const onSubmit = (a: ArticleData) => {
    setError(null);
    startTransition(async () => {
      applyPatch({ kind: 'status', id: a.id, status: 'PENDING' });
      try {
        await submitForReview(a.id);
        router.refresh();
      } catch (e: any) {
        setError(e?.message || 'Erreur');
        router.refresh();
      }
    });
  };

  const onApprove = (a: ArticleData) => {
    setError(null);
    startTransition(async () => {
      applyPatch({ kind: 'status', id: a.id, status: 'APPROVED' });
      try {
        await approveArticle(a.id);
        router.refresh();
      } catch (e: any) {
        setError(e?.message || 'Erreur');
        router.refresh();
      }
    });
  };

  const [rejectTarget, setRejectTarget] = useState<ArticleData | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const onRejectConfirm = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setError(null);
    const target = rejectTarget;
    setRejectTarget(null);
    startTransition(async () => {
      applyPatch({ kind: 'status', id: target.id, status: 'REJECTED' });
      try {
        await rejectArticle(target.id, rejectReason);
        setRejectReason('');
        router.refresh();
      } catch (e: any) {
        setError(e?.message || 'Erreur');
        router.refresh();
      }
    });
  };

  const onDelete = (a: ArticleData) => {
    if (!confirm(`Supprimer définitivement l'article "${a.title}" ? Cette action est irréversible.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      applyPatch({ kind: 'delete', id: a.id });
      try {
        await deleteNews(a.id);
        router.refresh();
      } catch (e: any) {
        setError(e?.message || 'Erreur lors de la suppression');
        router.refresh();
      }
    });
  };

  return (
    <div>
      <Link
        href="/dashboard/news/new"
        style={{
          ...body, fontSize: 12.5, fontWeight: 700,
          padding: '12px 20px',
          background: LRH.red, color: '#fff',
          border: 'none', borderRadius: 4,
          cursor: 'pointer', letterSpacing: '0.06em',
          textTransform: 'uppercase', textDecoration: 'none',
          display: 'inline-block', marginBottom: 20,
        }}
      >
        + Nouvel article
      </Link>

      {error && (
        <div style={{
          ...mono, fontSize: 11.5, color: LRH.red,
          padding: '10px 14px', marginBottom: 16,
          background: 'rgba(168,32,47,0.08)',
          border: '1px solid rgba(168,32,47,0.2)',
        }}>
          {error}
        </div>
      )}

      {/* Reject reason modal */}
      {rejectTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20,
        }}>
          <div style={{
            background: '#fff', padding: 28, maxWidth: 480, width: '100%',
            border: `2px solid ${LRH.red}`,
          }}>
            <div style={{ ...display, fontSize: 18, fontWeight: 700, color: LRH.navy, marginBottom: 12 }}>
              Refuser l&apos;article
            </div>
            <div style={{ ...body, fontSize: 13, color: LRH.mute, marginBottom: 16 }}>
              &laquo; {rejectTarget.title} &raquo; — indiquez le motif du refus au club.
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motif du refus (obligatoire)..."
              rows={3}
              autoFocus
              style={{
                ...body, fontSize: 14, width: '100%', padding: '10px 12px',
                border: `1px solid ${LRH.hairStrong}`, boxSizing: 'border-box',
                marginBottom: 16, resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                style={{
                  ...mono, fontSize: 11, fontWeight: 700, padding: '10px 16px',
                  background: 'transparent', color: LRH.mute, border: `1px solid ${LRH.hair}`,
                  cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase',
                  minHeight: 44,
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={onRejectConfirm}
                disabled={!rejectReason.trim()}
                style={{
                  ...mono, fontSize: 11, fontWeight: 700, padding: '10px 16px',
                  background: rejectReason.trim() ? LRH.red : LRH.hairStrong,
                  color: '#fff', border: 'none',
                  cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  minHeight: 44,
                }}
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}

      {optimistic.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: '#fff', border: '1px dashed ' + LRH.hairStrong,
          ...mono, fontSize: 12, color: LRH.mute, letterSpacing: '0.1em',
        }}>
          Aucun article pour le moment.
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            opacity: isPending ? 0.85 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {optimistic.map((a) => (
            <ArticleRow
              key={a.id}
              a={a}
              isAdmin={isAdmin}
              busy={isPending}
              onTogglePublish={() => onTogglePublish(a)}
              onSubmit={() => onSubmit(a)}
              onApprove={() => onApprove(a)}
              onReject={() => setRejectTarget(a)}
              onDelete={() => onDelete(a)}
            />
          ))}
        </div>
      )}

      <Paginator
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        hrefBuilder={(p) => (p > 1 ? `/dashboard/news?page=${p}` : '/dashboard/news')}
        itemLabel="article"
      />
    </div>
  );
}

type ArticleRowProps = {
  a: ArticleData;
  isAdmin: boolean;
  busy: boolean;
  onTogglePublish: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
};

function ArticleRowImpl({
  a,
  isAdmin,
  busy,
  onTogglePublish,
  onSubmit,
  onApprove,
  onReject,
  onDelete,
}: ArticleRowProps) {
  const cat = CATEGORY_LABEL[a.category] ?? { label: a.category, color: LRH.mute };
  const statusBadge = STATUS_BADGE[a.status] ?? STATUS_BADGE.DRAFT;
  const date = a.publishedAt ?? a.createdAt;
  const dateLabel = new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const borderLeftColor = a.status === 'APPROVED' ? cat.color
    : a.status === 'PENDING' ? '#F59E0B'
    : a.status === 'REJECTED' ? LRH.red
    : LRH.hairStrong;

  return (
    <div
      className="lrh-news-row"
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${borderLeftColor}`,
        padding: '14px 18px',
        opacity: a.status === 'REJECTED' ? 0.7 : a.status === 'DRAFT' ? 0.85 : 1,
      }}
    >
      {/* Cover thumb */}
      <div
        style={{
          width: '100%',
          aspectRatio: '72 / 56',
          background: a.coverImage
            ? `url(${a.coverImage}) center / cover no-repeat`
            : LRH.paperWarm,
          border: '1px solid ' + LRH.hair,
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <div className="lrh-news-row-content">
        <div className="lrh-news-row-meta">
          <span style={{
            ...mono, fontSize: 9, fontWeight: 800,
            padding: '2px 7px', background: cat.color, color: '#fff',
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            {cat.label}
          </span>
          <span style={{
            ...mono, fontSize: 9, fontWeight: 700,
            padding: '2px 6px',
            background: statusBadge.bg, color: statusBadge.fg,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            {statusBadge.label}
          </span>
          <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.06em' }}>
            {dateLabel}
          </span>
          {isAdmin && a.club && (
            <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.06em' }}>
              · {a.club.shortCode ?? a.club.name}
            </span>
          )}
        </div>
        <div
          className="lrh-news-row-title"
          style={{
            ...display, fontWeight: 700, fontSize: 15,
            color: LRH.navy, letterSpacing: '-0.01em',
            overflowWrap: 'break-word', wordBreak: 'break-word',
          }}
        >
          {a.title}
        </div>
        {a.excerpt && (
          <div
            className="lrh-news-row-excerpt"
            style={{ ...body, fontSize: 12, color: LRH.mute, marginTop: 4 }}
          >
            {a.excerpt}
          </div>
        )}
        {/* Rejection reason shown to club */}
        {a.status === 'REJECTED' && a.rejectionReason && (
          <div style={{
            marginTop: 8, padding: '8px 12px',
            background: 'rgba(168,32,47,0.06)',
            border: `1px solid rgba(168,32,47,0.2)`,
            borderLeft: `3px solid ${LRH.red}`,
            ...body, fontSize: 12, color: '#991B1B', lineHeight: 1.5,
          }}>
            Motif du refus : {a.rejectionReason}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="lrh-news-row-actions">
        {a.published && (
          <Link
            href={`/actualites/${a.slug}`}
            target="_blank"
            rel="noopener"
            style={{
              ...body, fontSize: 11, fontWeight: 700,
              padding: '6px 11px',
              background: 'transparent', color: LRH.navy,
              border: '1px solid ' + LRH.hairStrong,
              cursor: 'pointer', letterSpacing: '0.06em',
              textTransform: 'uppercase', textDecoration: 'none',
            }}
          >
            Voir
          </Link>
        )}
        <Link
          href={`/dashboard/news/${a.id}/edit`}
          style={{
            ...body, fontSize: 11, fontWeight: 700,
            padding: '6px 11px',
            background: LRH.navy, color: '#fff',
            border: '1px solid ' + LRH.navy,
            cursor: 'pointer', letterSpacing: '0.06em',
            textTransform: 'uppercase', textDecoration: 'none',
          }}
        >
          Modifier
        </Link>

        {/* Club actions */}
        {!isAdmin && (a.status === 'DRAFT' || a.status === 'REJECTED') && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            style={{
              ...body, fontSize: 11, fontWeight: 700,
              padding: '6px 11px',
              background: '#F59E0B', color: '#fff',
              border: '1px solid #F59E0B',
              cursor: busy ? 'wait' : 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          >
            Soumettre
          </button>
        )}
        {!isAdmin && a.status === 'PENDING' && (
          <span style={{
            ...mono, fontSize: 10, color: '#F59E0B', padding: '6px 11px',
            letterSpacing: '0.08em',
          }}>
            En attente de validation…
          </span>
        )}

        {/* Admin actions */}
        {isAdmin && a.status === 'PENDING' && (
          <>
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              style={{
                ...body, fontSize: 11, fontWeight: 700,
                padding: '6px 11px',
                background: '#1d6b3f', color: '#fff',
                border: '1px solid #1d6b3f',
                cursor: busy ? 'wait' : 'pointer',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontFamily: 'inherit',
              }}
            >
              Approuver
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              style={{
                ...body, fontSize: 11, fontWeight: 700,
                padding: '6px 11px',
                background: 'transparent', color: LRH.red,
                border: `1px solid ${LRH.red}`,
                cursor: busy ? 'wait' : 'pointer',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontFamily: 'inherit',
              }}
            >
              Refuser
            </button>
          </>
        )}
        {isAdmin && a.status !== 'PENDING' && (
          <button
            type="button"
            onClick={onTogglePublish}
            disabled={busy}
            style={{
              ...body, fontSize: 11, fontWeight: 700,
              padding: '6px 11px',
              background: a.published ? 'transparent' : '#1d6b3f',
              color: a.published ? LRH.mute : '#fff',
              border: '1px solid ' + (a.published ? LRH.hairStrong : '#1d6b3f'),
              cursor: busy ? 'wait' : 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          >
            {busy ? '…' : (a.published ? 'Dépublier' : 'Publier')}
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          style={{
            ...body, fontSize: 11, fontWeight: 700,
            padding: '6px 11px',
            background: 'transparent', color: LRH.red,
            border: '1px solid ' + LRH.red,
            cursor: busy ? 'wait' : 'pointer',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            fontFamily: 'inherit',
          }}
        >
          Suppr.
        </button>
      </div>
    </div>
  );
}

const ArticleRow = React.memo(ArticleRowImpl, (prev, next) =>
  prev.a === next.a &&
  prev.isAdmin === next.isAdmin &&
  prev.busy === next.busy,
);
