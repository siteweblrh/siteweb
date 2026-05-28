'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import {
  createClubDocument,
  updateClubDocument,
  deleteClubDocument,
  type ClubDocumentInput,
} from '@/lib/actions/clubDocument';

type DocumentRow = {
  id: string;
  title: string;
  url: string;
  category: string | null;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string | null } | null;
};

// Suggestions de catégories courantes. L'admin peut entrer du texte libre,
// ces suggestions servent juste de raccourcis dans le datalist.
const CATEGORY_SUGGESTIONS = [
  'Règlement intérieur',
  'Statuts',
  'Autorisation parentale',
  'Formulaire d\'inscription',
  'Certificat médical',
  'Cotisations',
  'Autre',
];

type FormState = ClubDocumentInput & { id?: string };

const EMPTY_FORM: FormState = {
  title: '',
  url: '',
  category: '',
  description: '',
  isPublic: false,
};

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 14,
  padding: '10px 12px',
  width: '100%',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  fontWeight: 700,
  color: LRH.mute,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 6,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={labelStyle}>{children}</label>;
}

export function ClubDocumentsAdmin({
  clubId,
  documents,
}: {
  clubId: string;
  documents: DocumentRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(editing?.id);

  const submit = () => {
    if (!editing) return;
    setError(null);
    if (!editing.title.trim()) { setError('Titre requis.'); return; }
    if (!editing.url.trim()) { setError('URL requise.'); return; }

    startTransition(async () => {
      try {
        const payload: ClubDocumentInput = {
          title: editing.title.trim(),
          url: editing.url.trim(),
          category: editing.category?.trim() || null,
          description: editing.description?.trim() || null,
          isPublic: editing.isPublic,
        };
        if (isEdit && editing.id) {
          await updateClubDocument(editing.id, payload);
        } else {
          await createClubDocument(clubId, payload);
        }
        setEditing(null);
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  const onDelete = (doc: DocumentRow) => {
    if (!confirm(`Supprimer « ${doc.title} » ?`)) return;
    startTransition(async () => {
      try {
        await deleteClubDocument(doc.id);
        router.refresh();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : 'Erreur de suppression');
      }
    });
  };

  // Groupe par catégorie pour lisibilité. Les "Sans catégorie" en fin.
  const grouped = new Map<string, DocumentRow[]>();
  for (const d of documents) {
    const key = d.category || '— Sans catégorie —';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  }
  const sortedCategories = Array.from(grouped.keys()).sort((a, b) => {
    if (a.startsWith('—')) return 1;
    if (b.startsWith('—')) return -1;
    return a.localeCompare(b, 'fr');
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, opacity: isPending ? 0.85 : 1, transition: 'opacity 0.15s' }}>
      {/* Form édition/création */}
      {editing && (
        <div style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderLeft: `3px solid ${LRH.red}`,
          padding: 24,
        }}>
          <div style={{
            ...mono, fontSize: 11, fontWeight: 700,
            color: LRH.red, letterSpacing: '0.18em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>
            ▸ {isEdit ? 'Modifier le document' : 'Nouveau document'}
          </div>

          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Titre *</FieldLabel>
            <input
              style={inputStyle}
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="Ex : Règlement intérieur 2025-2026"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Lien (URL) *</FieldLabel>
            <input
              style={inputStyle}
              type="url"
              value={editing.url}
              onChange={(e) => setEditing({ ...editing, url: e.target.value })}
              placeholder="https://drive.google.com/file/d/..."
            />
            <div style={{ ...mono, fontSize: 9.5, color: LRH.mute, marginTop: 4, letterSpacing: '0.06em' }}>
              Le document doit être partagé en lecture publique sur Google Drive (ou équivalent).
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14, marginBottom: 14 }}>
            <div>
              <FieldLabel>Catégorie</FieldLabel>
              <input
                style={inputStyle}
                list="lrh-doc-categories"
                value={editing.category ?? ''}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                placeholder="Ex : Règlement intérieur"
              />
              <datalist id="lrh-doc-categories">
                {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <FieldLabel>Visibilité</FieldLabel>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingTop: 10 }}>
                <input
                  type="checkbox"
                  checked={editing.isPublic}
                  onChange={(e) => setEditing({ ...editing, isPublic: e.target.checked })}
                />
                <span style={{ ...body, fontSize: 13, color: LRH.ink2 }}>
                  Afficher sur la fiche club publique
                </span>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Description (facultatif)</FieldLabel>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              value={editing.description ?? ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Quelques mots sur le contenu du document…"
            />
          </div>

          {error && (
            <div style={{
              ...mono, fontSize: 11, color: LRH.red,
              marginBottom: 12, padding: '8px 12px',
              background: 'rgba(168,32,47,0.08)',
              border: '1px solid rgba(168,32,47,0.2)',
            }}>
              ⚠ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={submit}
              disabled={isPending}
              style={{
                ...body, fontSize: 12.5, fontWeight: 700,
                padding: '10px 18px',
                background: LRH.navy, color: '#fff',
                border: 'none', cursor: 'pointer',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? 'Enregistrement…' : (isEdit ? 'Enregistrer' : 'Créer')}
            </button>
            <button
              onClick={() => { setEditing(null); setError(null); }}
              disabled={isPending}
              style={{
                ...body, fontSize: 12.5, fontWeight: 700,
                padding: '10px 18px',
                background: 'transparent', color: LRH.mute,
                border: '1px solid ' + LRH.hairStrong, cursor: 'pointer',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste + bouton créer */}
      {!editing && (
        <div>
          <button
            onClick={() => setEditing(EMPTY_FORM)}
            style={{
              ...body, fontSize: 12.5, fontWeight: 700,
              padding: '12px 20px',
              background: LRH.red, color: '#fff',
              border: 'none', cursor: 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            + Nouveau document
          </button>

          {documents.length === 0 ? (
            <div style={{
              padding: 48, textAlign: 'center',
              background: '#fff', border: '2px dashed ' + LRH.hairStrong,
            }}>
              <div style={{ ...display, fontSize: 18, color: LRH.navy, marginBottom: 8 }}>
                Aucun document
              </div>
              <div style={{ ...body, fontSize: 13, color: LRH.mute }}>
                Ajoute un règlement, des statuts, des formulaires… visibles ou non sur la fiche publique.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {sortedCategories.map((cat) => (
                <div key={cat}>
                  <div style={{
                    ...mono, fontSize: 10, fontWeight: 700,
                    color: LRH.navy, letterSpacing: '0.16em',
                    textTransform: 'uppercase', marginBottom: 10,
                  }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grouped.get(cat)!.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        onEdit={() => setEditing({
                          id: doc.id,
                          title: doc.title,
                          url: doc.url,
                          category: doc.category ?? '',
                          description: doc.description ?? '',
                          isPublic: doc.isPublic,
                        })}
                        onDelete={() => onDelete(doc)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentRow({
  doc,
  onEdit,
  onDelete,
}: {
  doc: DocumentRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid ' + LRH.hair,
      borderLeft: `3px solid ${doc.isPublic ? '#1B7340' : LRH.mute}`,
      padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...body, fontSize: 14, fontWeight: 700,
              color: LRH.navy, textDecoration: 'none',
              borderBottom: '1px dotted ' + LRH.navy,
            }}
          >
            {doc.title} ↗
          </a>
          <span style={{
            ...mono, fontSize: 9, fontWeight: 700,
            padding: '2px 6px',
            background: doc.isPublic ? '#1B7340' : LRH.mute,
            color: '#fff',
            letterSpacing: '0.1em',
          }}>
            {doc.isPublic ? 'PUBLIC' : 'INTERNE'}
          </span>
        </div>
        {doc.description && (
          <div style={{ ...body, fontSize: 12.5, color: LRH.ink2, marginTop: 6, lineHeight: 1.45 }}>
            {doc.description}
          </div>
        )}
        <div style={{
          ...mono, fontSize: 9.5, color: LRH.mute,
          letterSpacing: '0.04em', marginTop: 6,
        }}>
          Ajouté le {new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          {doc.createdBy?.name && ` par ${doc.createdBy.name}`}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={onEdit}
          style={{
            ...mono, fontSize: 10, fontWeight: 700,
            padding: '6px 12px',
            background: 'transparent', color: LRH.navy,
            border: '1px solid ' + LRH.navy, cursor: 'pointer',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}
        >
          Modifier
        </button>
        <button
          onClick={onDelete}
          style={{
            ...mono, fontSize: 10, fontWeight: 700,
            padding: '6px 12px',
            background: 'transparent', color: LRH.red,
            border: '1px solid ' + LRH.red, cursor: 'pointer',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}
        >
          Suppr.
        </button>
      </div>
    </div>
  );
}
