'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import {
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  type UserCreateInput,
  type UserAdminRow,
} from '@/lib/actions/user';
import type { ClubAdminRow } from '@/lib/actions/club';

type Role = 'ADMIN' | 'USER';

type FormState = {
  id?: string;
  email: string;
  name: string;
  password: string; // creation only ; ignored on edit
  role: Role;
  clubId: string;
};

const EMPTY_FORM: FormState = {
  email: '',
  name: '',
  password: '',
  role: 'USER',
  clubId: '',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        ...mono,
        fontSize: 10,
        fontWeight: 700,
        color: LRH.mute,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 14,
  padding: '10px 12px',
  width: '100%',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
};

function randomPassword(): string {
  // 12 char alphanum, accentué de quelques symboles non-ambigus
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(12);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(arr);
    for (const v of arr) out += chars[v % chars.length];
  } else {
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function UserForm({
  initial,
  clubs,
  onCancel,
  onDone,
}: {
  initial: FormState;
  clubs: ClubAdminRow[];
  onCancel: () => void;
  onDone: (passwordRevealed?: string) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial.id);

  const submit = async () => {
    if (!form.email.trim() || !form.name.trim()) {
      setError('Email et nom requis.');
      return;
    }
    if (!isEdit && form.password.length < 8) {
      setError('Mot de passe : 8 caractères minimum.');
      return;
    }
    if (form.role === 'USER' && !form.clubId) {
      setError('Un compte manager doit être rattaché à un club.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit && initial.id) {
        await updateUser(initial.id, {
          email: form.email.trim(),
          name: form.name.trim(),
          role: form.role,
          clubId: form.role === 'USER' ? form.clubId : null,
        });
        onDone();
      } else {
        const payload: UserCreateInput = {
          email: form.email.trim(),
          name: form.name.trim(),
          password: form.password,
          role: form.role,
          clubId: form.role === 'USER' ? form.clubId : null,
        };
        await createUser(payload);
        onDone(form.password);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${form.role === 'ADMIN' ? LRH.gold : LRH.navy}`,
        padding: 24,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 11,
          fontWeight: 700,
          color: LRH.red,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {isEdit ? '▸ Modifier le compte' : '▸ Nouveau compte'}
      </div>

      {/* Role */}
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Rôle *</FieldLabel>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['USER', 'ADMIN'] as const).map((r) => {
            const isActive = form.role === r;
            const bg = r === 'ADMIN' ? LRH.gold : LRH.navy;
            const fg = r === 'ADMIN' ? LRH.navy : '#fff';
            return (
              <button
                key={r}
                type="button"
                onClick={() => setForm({ ...form, role: r })}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 4,
                  background: isActive ? bg : '#fff',
                  color: isActive ? fg : LRH.ink2,
                  border: `1px solid ${isActive ? bg : LRH.hairStrong}`,
                  cursor: 'pointer',
                  ...display,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isActive ? fg : bg,
                  }}
                />
                {r === 'ADMIN' ? 'Administrateur LRH' : 'Manager de club'}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Email *</FieldLabel>
          <input
            type="email"
            style={inputStyle}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="manager@club.re"
          />
        </div>
        <div>
          <FieldLabel>Nom complet *</FieldLabel>
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Marie Dupont"
          />
        </div>
      </div>

      {/* Club affectation : visible uniquement pour USER */}
      {form.role === 'USER' && (
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Club rattaché *</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.clubId}
            onChange={(e) => setForm({ ...form, clubId: e.target.value })}
          >
            <option value="">— Choisir un club —</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kind === 'ENTENTE' ? '◇ ' : ''}
                {c.name} {c.shortCode ? `(${c.shortCode})` : ''} · {c.city}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Password (create only) */}
      {!isEdit && (
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Mot de passe initial * (au moins 8 caractères)</FieldLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              style={{ ...inputStyle, fontFamily: 'monospace' }}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Saisissez ou générez"
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, password: randomPassword() })}
              style={{
                ...body,
                fontSize: 12,
                fontWeight: 700,
                padding: '10px 14px',
                borderRadius: 4,
                background: 'transparent',
                color: LRH.navy,
                border: '1px solid ' + LRH.navy,
                cursor: 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              Générer
            </button>
          </div>
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.08em',
              marginTop: 6,
            }}
          >
            Notez ce mot de passe — il sera affiché une dernière fois après création, puis il faudra le réinitialiser pour le retrouver.
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            marginBottom: 12,
            padding: '8px 12px',
            background: 'rgba(168,32,47,0.08)',
            border: '1px solid rgba(168,32,47,0.2)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={submit}
          disabled={saving}
          style={{
            ...body,
            fontSize: 12.5,
            fontWeight: 700,
            padding: '10px 18px',
            borderRadius: 4,
            background: LRH.navy,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            ...body,
            fontSize: 12.5,
            fontWeight: 700,
            padding: '10px 18px',
            borderRadius: 4,
            background: 'transparent',
            color: LRH.mute,
            border: '1px solid ' + LRH.hairStrong,
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function PasswordRevealedBanner({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        background: LRH.navy,
        color: '#fff',
        padding: 20,
        marginBottom: 16,
        borderLeft: `4px solid ${LRH.gold}`,
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 11,
          fontWeight: 800,
          color: LRH.gold,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        ✓ Compte créé — transmettez ces identifiants au manager
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 18px', alignItems: 'center' }}>
        <span style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' }}>
          EMAIL
        </span>
        <span style={{ ...body, fontSize: 14, fontWeight: 700 }}>{email}</span>
        <span style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' }}>
          MOT DE PASSE
        </span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 16,
            fontWeight: 800,
            color: LRH.gold,
            letterSpacing: '0.04em',
          }}
        >
          {password}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(`${email} / ${password}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{
            ...body,
            fontSize: 11.5,
            fontWeight: 700,
            padding: '8px 14px',
            borderRadius: 4,
            background: LRH.gold,
            color: LRH.navy,
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {copied ? '✓ Copié' : 'Copier'}
        </button>
        <button
          onClick={onClose}
          style={{
            ...body,
            fontSize: 11.5,
            fontWeight: 700,
            padding: '8px 14px',
            borderRadius: 4,
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export function UsersAdmin({
  initialUsers,
  clubs,
  currentUserId,
}: {
  initialUsers: UserAdminRow[];
  clubs: ClubAdminRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [revealed, setRevealed] = useState<{ email: string; password: string } | null>(null);

  const refresh = (passwordRevealed?: string) => {
    if (passwordRevealed && editing && !editing.id) {
      setRevealed({ email: editing.email, password: passwordRevealed });
    }
    setEditing(null);
    router.refresh();
  };

  const onResetPassword = async (row: UserAdminRow) => {
    const pwd = prompt(
      `Nouveau mot de passe pour ${row.name} (${row.email}) — 8 caractères minimum :`,
    );
    if (!pwd) return;
    if (pwd.length < 8) {
      alert('Mot de passe trop court (8 caractères minimum).');
      return;
    }
    try {
      await resetUserPassword(row.id, pwd);
      setRevealed({ email: row.email ?? '', password: pwd });
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de réinitialisation');
    }
  };

  const onDelete = async (row: UserAdminRow) => {
    if (!confirm(`Supprimer le compte de ${row.name} (${row.email}) ?`)) return;
    try {
      await deleteUser(row.id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de suppression');
    }
  };

  const admins = initialUsers.filter((u) => u.role === 'ADMIN');
  const managers = initialUsers.filter((u) => u.role === 'USER');

  return (
    <div>
      {revealed && (
        <PasswordRevealedBanner
          email={revealed.email}
          password={revealed.password}
          onClose={() => setRevealed(null)}
        />
      )}

      {editing && (
        <UserForm
          initial={editing}
          clubs={clubs}
          onCancel={() => setEditing(null)}
          onDone={refresh}
        />
      )}

      {!editing && (
        <button
          onClick={() => setEditing({ ...EMPTY_FORM })}
          style={{
            ...body,
            fontSize: 12.5,
            fontWeight: 700,
            padding: '12px 20px',
            borderRadius: 4,
            background: LRH.red,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          + Nouveau compte
        </button>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <UserGroup
          title="Administrateurs LRH"
          list={admins}
          accent={LRH.gold}
          currentUserId={currentUserId}
          onEdit={(u) =>
            setEditing({
              id: u.id,
              email: u.email ?? '',
              name: u.name ?? '',
              password: '',
              role: u.role as Role,
              clubId: u.clubId ?? '',
            })
          }
          onResetPassword={onResetPassword}
          onDelete={onDelete}
        />
        <UserGroup
          title="Managers de club"
          list={managers}
          accent={LRH.navy}
          currentUserId={currentUserId}
          onEdit={(u) =>
            setEditing({
              id: u.id,
              email: u.email ?? '',
              name: u.name ?? '',
              password: '',
              role: u.role as Role,
              clubId: u.clubId ?? '',
            })
          }
          onResetPassword={onResetPassword}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function UserGroup({
  title,
  list,
  accent,
  currentUserId,
  onEdit,
  onResetPassword,
  onDelete,
}: {
  title: string;
  list: UserAdminRow[];
  accent: string;
  currentUserId: string;
  onEdit: (u: UserAdminRow) => void;
  onResetPassword: (u: UserAdminRow) => void;
  onDelete: (u: UserAdminRow) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
        <div style={{ width: 14, height: 2, background: accent }} />
        <div
          style={{
            ...display,
            fontWeight: 700,
            fontSize: 18,
            color: LRH.navy,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        <div style={{ flex: 1, height: 1, background: LRH.hair }} />
        <div
          style={{
            ...mono,
            fontSize: 10,
            color: LRH.mute,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          {list.length.toString().padStart(2, '0')} compte{list.length > 1 ? 's' : ''}
        </div>
      </div>
      {list.length === 0 ? (
        <div
          style={{
            padding: 18,
            background: '#fff',
            border: '1px dashed ' + LRH.hairStrong,
            ...body,
            fontSize: 13,
            color: LRH.mute,
            textAlign: 'center',
          }}
        >
          Aucun compte.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <div
                key={u.id}
                className="lrh-admin-row"
                style={{
                  background: '#fff',
                  border: '1px solid ' + LRH.hair,
                  borderLeft: `3px solid ${accent}`,
                  padding: '14px 18px',
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: accent,
                    color: accent === LRH.gold ? LRH.navy : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...display,
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {(u.name ?? '?').substring(0, 2).toUpperCase()}
                </div>
                <div className="lrh-admin-row-content">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        ...display,
                        fontWeight: 700,
                        fontSize: 15,
                        color: LRH.navy,
                        letterSpacing: '-0.01em',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}
                    >
                      {u.name}
                    </span>
                    {isSelf && (
                      <span
                        style={{
                          ...mono,
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 2,
                          background: LRH.gold,
                          color: LRH.navy,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Vous
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: LRH.mute,
                      letterSpacing: '0.06em',
                      marginTop: 2,
                      wordBreak: 'break-all',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    ✉ {u.email}
                  </div>
                  {u.club && (
                    <div
                      style={{
                        ...mono,
                        fontSize: 10.5,
                        color: LRH.ink2,
                        letterSpacing: '0.06em',
                        marginTop: 4,
                        fontWeight: 600,
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}
                    >
                      ⌂ {u.club.kind === 'ENTENTE' ? '◇ ' : ''}
                      {u.club.name}
                      {u.club.shortCode ? ` (${u.club.shortCode})` : ''}
                    </div>
                  )}
                  <div
                    className="lrh-admin-row-meta"
                    style={{
                      ...mono,
                      fontSize: 9.5,
                      color: LRH.mute,
                      letterSpacing: '0.08em',
                      marginTop: 4,
                    }}
                  >
                    <span>
                      {u._count.articles} article{u._count.articles > 1 ? 's' : ''}
                    </span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>
                      {u._count.sessions} session{u._count.sessions > 1 ? 's' : ''} active
                      {u._count.sessions > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="lrh-admin-row-actions">
                  <button
                    onClick={() => onEdit(u)}
                    style={{
                      ...body,
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: 4,
                      background: 'transparent',
                      color: LRH.navy,
                      border: '1px solid ' + LRH.navy,
                      cursor: 'pointer',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => onResetPassword(u)}
                    style={{
                      ...body,
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: 4,
                      background: 'transparent',
                      color: LRH.ink2,
                      border: '1px solid ' + LRH.hairStrong,
                      cursor: 'pointer',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Réinit. MDP
                  </button>
                  {!isSelf && (
                    <button
                      onClick={() => onDelete(u)}
                      style={{
                        ...body,
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: 4,
                        background: 'transparent',
                        color: LRH.red,
                        border: '1px solid ' + LRH.red,
                        cursor: 'pointer',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Suppr.
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
