'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { Paginator } from '@/components/lrh/sections';
import { deleteNews, updateNews } from '@/lib/actions/news';

type ArticleData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  category: string;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string | null; email: string | null } | null;
  club: { name: string; shortCode: string | null } | null;
};

// Patch optimiste : on applique localement la modif AVANT que le server
// action ne réponde (rollback automatique si erreur).
type OptimisticPatch =
  | { kind: 'toggle-publish'; id: string; nextPublished: boolean }
  | { kind: 'delete'; id: string };

function applyOptimistic(state: ArticleData[], patch: OptimisticPatch): ArticleData[] {
  if (patch.kind === 'delete') {
    return state.filter((a) => a.id !== patch.id);
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
  // L'UI affiche `optimistic`. Chaque appel `applyPatch(...)` est immédiat
  // côté client ; React rejoue la liste vraie quand router.refresh() arrive.
  const [optimistic, applyPatch] = useOptimistic(articles, applyOptimistic);

  const onTogglePublish = (a: ArticleData) => {
    const nextPublished = !a.published;
    setError(null);
    // `applyPatch` doit vivre dans une transition (sinon React jette une
    // erreur "useOptimistic outside a transition"). startTransition
    // garde l'UI réactive pendant que le server action tourne.
    startTransition(async () => {
      applyPatch({ kind: 'toggle-publish', id: a.id, nextPublished });
      try {
        await updateNews(a.id, { published: nextPublished });
        router.refresh();
      } catch (e: any) {
        setError(e?.message || 'Erreur lors de la mise à jour');
        // Le patch optimiste est jeté automatiquement quand la transition
        // termine sans nouveau render serveur (rollback gratuit).
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
          ⚠ {error}
        </div>
      )}

      {optimistic.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: '#fff', border: '1px dashed ' + LRH.hairStrong,
          ...mono, fontSize: 12, color: LRH.mute, letterSpacing: '0.1em',
        }}>
          Aucun article publié pour le moment.
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            // Pendant la transition serveur, on grisonne légèrement la liste
            // (sans bloquer l'interaction) pour signaler qu'un rafraîchissement
            // est en cours. Disparaît dès que le router a refresh fini.
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
  onDelete: () => void;
};

function ArticleRowImpl({
  a,
  isAdmin,
  busy,
  onTogglePublish,
  onDelete,
}: ArticleRowProps) {
  const cat = CATEGORY_LABEL[a.category] ?? { label: a.category, color: LRH.mute };
  const date = a.publishedAt ?? a.createdAt;
  const dateLabel = new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div
      className="lrh-news-row"
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${a.published ? cat.color : LRH.hairStrong}`,
        padding: '14px 18px',
        opacity: a.published ? 1 : 0.78,
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
          {a.published ? (
            <span style={{
              ...mono, fontSize: 9, fontWeight: 700,
              padding: '2px 6px',
              background: '#1d6b3f', color: '#fff',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              ● En ligne
            </span>
          ) : (
            <span style={{
              ...mono, fontSize: 9, fontWeight: 700,
              padding: '2px 6px',
              background: LRH.hairStrong, color: LRH.mute,
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              ○ Brouillon
            </span>
          )}
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
            style={{
              ...body, fontSize: 12, color: LRH.mute, marginTop: 4,
            }}
          >
            {a.excerpt}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="lrh-news-row-actions">
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

// Mémoïsé : la liste re-rend à chaque transition (isPending change), on évite
// que les 10 cards ré-évaluent leur JSX si seul `busy` change pour une ligne.
const ArticleRow = React.memo(ArticleRowImpl, (prev, next) =>
  prev.a === next.a &&
  prev.isAdmin === next.isAdmin &&
  prev.busy === next.busy,
);
