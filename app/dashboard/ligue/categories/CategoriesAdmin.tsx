'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories,
  type CategoryRow,
} from '@/lib/actions/category';

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 13,
  padding: '9px 11px',
  width: '100%',
  // Sans box-sizing: border-box, padding + border débordent la largeur du
  // grid cell et grignotent le bouton à droite.
  boxSizing: 'border-box',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
};

const btnPrimary: React.CSSProperties = {
  ...body, fontSize: 12, fontWeight: 700,
  padding: '8px 14px', borderRadius: 4,
  background: LRH.navy, color: '#fff',
  border: 'none', cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

const btnGhost: React.CSSProperties = {
  ...body, fontSize: 11.5, fontWeight: 700,
  padding: '6px 12px', borderRadius: 4,
  background: 'transparent', color: LRH.ink2,
  border: '1px solid ' + LRH.hairStrong, cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

const btnDanger: React.CSSProperties = {
  ...body, fontSize: 11.5, fontWeight: 700,
  padding: '6px 12px', borderRadius: 4,
  background: 'transparent', color: LRH.red,
  border: '1px solid ' + LRH.red, cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

export function CategoriesAdmin({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [newSort, setNewSort] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSort, setEditSort] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    if (!newName.trim()) { setError('Nom requis.'); return; }
    setSaving(true); setError(null);
    try {
      await createCategory({
        name: newName.trim(),
        sortOrder: newSort.trim() === '' ? initialCategories.length * 10 : Number(newSort),
      });
      setNewName(''); setNewSort('');
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: CategoryRow) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditSort(String(c.sortOrder));
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true); setError(null);
    try {
      await updateCategory(editingId, {
        name: editName.trim(),
        sortOrder: editSort.trim() === '' ? 0 : Number(editSort),
      });
      setEditingId(null);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (c: CategoryRow) => {
    if (!confirm(`Supprimer la catégorie « ${c.name} » ? Les compétitions et horaires existants ne sont pas affectés.`)) return;
    try {
      await deleteCategory(c.id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de suppression');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Création */}
      <div
        style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderLeft: `3px solid ${LRH.gold}`,
          padding: 20,
        }}
      >
        <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
          ▸ Ajouter une catégorie
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Nom
            </label>
            <input
              style={inputStyle}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex : U16, Loisir, Vétérans"
              onKeyDown={(e) => { if (e.key === 'Enter' && !saving) onCreate(); }}
            />
          </div>
          <div>
            <label style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Ordre
            </label>
            <input
              type="number"
              style={inputStyle}
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
              placeholder="0"
            />
          </div>
          <button onClick={onCreate} disabled={saving} style={btnPrimary}>
            {saving ? '…' : '+ Ajouter'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            ...mono, fontSize: 12, color: LRH.red,
            padding: '10px 14px',
            background: 'rgba(168,32,47,0.08)',
            border: '1px solid rgba(168,32,47,0.2)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Liste */}
      {initialCategories.length === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center',
          background: '#fff', border: '1px dashed ' + LRH.hairStrong,
          ...body, fontSize: 13, color: LRH.mute,
        }}>
          <div style={{ marginBottom: 14 }}>
            Aucune catégorie. Ajoutez-en une au-dessus, ou importez la liste par défaut :
          </div>
          <button
            onClick={async () => {
              setSaving(true); setError(null);
              try {
                await seedDefaultCategories();
                router.refresh();
              } catch (e: any) {
                setError(e?.message || 'Erreur');
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
            style={btnPrimary}
          >
            ↓ Importer la liste par défaut
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {initialCategories.map((c) => {
            const isEditing = editingId === c.id;
            return (
              <div
                key={c.id}
                style={{
                  background: '#fff',
                  border: '1px solid ' + LRH.hair,
                  borderLeft: `3px solid ${LRH.navy}`,
                  padding: '12px 16px',
                  display: 'grid',
                  gridTemplateColumns: isEditing ? '1fr 100px auto' : 'auto 1fr auto auto',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                {isEditing ? (
                  <>
                    <input style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <input type="number" style={inputStyle} value={editSort} onChange={(e) => setEditSort(e.target.value)} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={btnPrimary} onClick={saveEdit} disabled={saving}>OK</button>
                      <button style={btnGhost} onClick={() => setEditingId(null)} disabled={saving}>Annuler</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        ...mono, fontSize: 10, color: LRH.mute,
                        letterSpacing: '0.1em',
                        background: LRH.paperWarm,
                        padding: '4px 8px',
                        minWidth: 36, textAlign: 'center',
                      }}
                    >
                      {c.sortOrder.toString().padStart(3, '0')}
                    </span>
                    <span style={{ ...display, fontWeight: 700, fontSize: 15, color: LRH.navy, letterSpacing: '-0.01em' }}>
                      {c.name}
                    </span>
                    <button style={btnGhost} onClick={() => startEdit(c)}>Modifier</button>
                    <button style={btnDanger} onClick={() => onDelete(c)}>Suppr.</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
