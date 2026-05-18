'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { Paginator } from '@/components/lrh/sections';
import { deleteNews, updateNews } from '@/lib/actions/news';

type ArticleRow = {
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
  articles: ArticleRow[];
  isAdmin: boolean;
  pagination: { currentPage: number; totalPages: number; totalItems: number };
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onTogglePublish = async (a: ArticleRow) => {
    setBusyId(a.id);
    setError(null);
    try {
      await updateNews(a.id, { published: !a.published });
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la mise à jour');
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (a: ArticleRow) => {
    if (!confirm(`Supprimer définitivement l'article "${a.title}" ? Cette action est irréversible.`)) {
      return;
    }
    setBusyId(a.id);
    setError(null);
    try {
      await deleteNews(a.id);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la suppression');
    } finally {
      setBusyId(null);
    }
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

      {articles.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: '#fff', border: '1px dashed ' + LRH.hairStrong,
          ...mono, fontSize: 12, color: LRH.mute, letterSpacing: '0.1em',
        }}>
          Aucun article publié pour le moment.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {articles.map((a) => (
            <ArticleRow
              key={a.id}
              a={a}
              isAdmin={isAdmin}
              busy={busyId === a.id}
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

function ArticleRow({
  a,
  isAdmin,
  busy,
  onTogglePublish,
  onDelete,
}: {
  a: ArticleRow;
  isAdmin: boolean;
  busy: boolean;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORY_LABEL[a.category] ?? { label: a.category, color: LRH.mute };
  const date = a.publishedAt ?? a.createdAt;
  const dateLabel = new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${a.published ? cat.color : LRH.hairStrong}`,
        padding: '14px 18px',
        display: 'grid',
        gridTemplateColumns: '72px 1fr auto',
        gap: 16,
        alignItems: 'center',
        opacity: a.published ? 1 : 0.78,
      }}
    >
      {/* Cover thumb */}
      <div
        style={{
          width: 72,
          height: 56,
          background: a.coverImage
            ? `url(${a.coverImage}) center / cover no-repeat`
            : LRH.paperWarm,
          border: '1px solid ' + LRH.hair,
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
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
        <div style={{
          ...display, fontWeight: 700, fontSize: 15,
          color: LRH.navy, letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {a.title}
        </div>
        {a.excerpt && (
          <div style={{
            ...body, fontSize: 12, color: LRH.mute, marginTop: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {a.excerpt}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
