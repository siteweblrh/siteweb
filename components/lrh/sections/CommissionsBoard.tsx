'use client';

import React, { useState } from 'react';
import { LRH, mono, display, body } from '../tokens';
import type { CommissionRow } from '@/lib/queries/ligue';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function MiniAvatar({ photo, fullName, size = 36 }: { photo: string | null; fullName: string; size?: number }) {
  if (photo) {
    return (
      <img src={photo} alt={fullName} style={{
        width: size, height: size, objectFit: 'cover',
        flexShrink: 0, border: '1px solid ' + LRH.hair,
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: LRH.paperWarm, color: LRH.navy,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      ...display, fontWeight: 800, fontSize: size * 0.34,
    }}>{getInitials(fullName)}</div>
  );
}

function CommissionPanel({
  c, isOpen, onToggle, mobileVariant = false,
}: {
  c: CommissionRow;
  isOpen: boolean;
  onToggle: () => void;
  mobileVariant?: boolean;
}) {
  const president = c.members.find((m) => m.role.toLowerCase().includes('président'));
  return (
    <div style={{
      background: '#fff',
      border: '1px solid ' + LRH.hair,
      borderLeft: `3px solid ${LRH.gold}`,
    }}>
      {/* Header strip */}
      <button
        onClick={onToggle}
        style={{
          all: 'unset',
          cursor: 'pointer', width: '100%', display: 'block',
          padding: mobileVariant ? '18px 16px' : '22px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{
                ...mono, fontSize: 10, fontWeight: 800,
                color: LRH.gold, background: LRH.navy,
                padding: '3px 7px', borderRadius: 2,
                letterSpacing: '0.14em',
              }}>{c.members.length.toString().padStart(2, '0')}</span>
              <span style={{
                ...mono, fontSize: 10, fontWeight: 700,
                color: LRH.red, letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}>Commission</span>
            </div>
            <div style={{
              ...display, fontWeight: 700,
              fontSize: mobileVariant ? 20 : 26,
              color: LRH.navy, letterSpacing: '-0.025em',
              lineHeight: 1.1,
            }}>{c.name}</div>
            {c.description && (
              <p style={{
                ...body, fontSize: 13.5, color: LRH.ink2,
                marginTop: 8, lineHeight: 1.55, maxWidth: 620,
              }}>{c.description}</p>
            )}
            {president && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                marginTop: 14, padding: '6px 10px 6px 6px',
                background: LRH.paperWarm, borderRadius: 2,
              }}>
                <MiniAvatar photo={president.photo} fullName={president.fullName} size={28} />
                <div style={{ ...body, fontSize: 12, color: LRH.ink2 }}>
                  <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Président · </span>
                  <span style={{ fontWeight: 700 }}>{president.fullName}</span>
                </div>
              </div>
            )}
          </div>
          <div style={{
            flexShrink: 0,
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isOpen ? LRH.navy : LRH.paperWarm,
            color: isOpen ? '#fff' : LRH.navy,
            ...display, fontWeight: 800, fontSize: 16,
            transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'all 0.2s',
          }}>+</div>
        </div>
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div style={{
          borderTop: '1px solid ' + LRH.hair,
          padding: mobileVariant ? '18px 16px' : '24px',
          background: LRH.paper,
        }}>
          {c.mission && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                ...mono, fontSize: 10, fontWeight: 700,
                color: LRH.mute, letterSpacing: '0.16em',
                textTransform: 'uppercase', marginBottom: 8,
              }}>▸ Mission</div>
              <p style={{
                ...body, fontSize: 14, color: LRH.ink2,
                lineHeight: 1.65, margin: 0, whiteSpace: 'pre-line',
              }}>{c.mission}</p>
            </div>
          )}

          <div style={{
            ...mono, fontSize: 10, fontWeight: 700,
            color: LRH.mute, letterSpacing: '0.16em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>▸ Composition</div>

          {c.members.length === 0 ? (
            <div style={{ ...body, fontSize: 13, color: LRH.mute, fontStyle: 'italic' }}>
              Aucun membre listé.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: mobileVariant ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 10,
            }}>
              {c.members.map((m) => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  background: '#fff',
                  border: '1px solid ' + LRH.hair,
                }}>
                  <MiniAvatar photo={m.photo} fullName={m.fullName} size={40} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      ...display, fontWeight: 700, fontSize: 14,
                      color: LRH.navy, letterSpacing: '-0.01em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{m.fullName}</div>
                    <div style={{
                      ...mono, fontSize: 9.5, color: LRH.mute,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      marginTop: 2,
                    }}>{m.role}</div>
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

export function CommissionsBoard({ commissions, mobileVariant = false }: { commissions: CommissionRow[]; mobileVariant?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(commissions[0]?.id ?? null);

  return (
    <div id="commissions" style={{
      background: LRH.paper,
      padding: mobileVariant ? '40px 16px' : '72px 64px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: mobileVariant ? 24 : 36, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{
              ...mono, fontSize: 11, fontWeight: 700,
              color: LRH.gold, letterSpacing: '0.22em',
            }}>04</span>
            <span style={{
              ...mono, fontSize: 11, fontWeight: 700,
              color: LRH.mute, letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>Commissions de la Ligue</span>
          </div>
          <h2 style={{
            ...display, fontWeight: 700,
            fontSize: mobileVariant ? 30 : 44,
            color: LRH.navy, margin: 0,
            letterSpacing: '-0.035em', lineHeight: 1.05,
          }}>
            Là où le travail<br/>de fond se fait.
          </h2>
        </div>
        <div style={{
          ...mono, fontSize: 10.5, fontWeight: 700,
          color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>{commissions.length.toString().padStart(2, '0')} {commissions.length > 1 ? 'commissions' : 'commission'}</div>
      </div>

      {commissions.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: '#fff', border: '1px dashed ' + LRH.hairStrong,
        }}>
          <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ vide ]</div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>Aucune commission publiée.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {commissions.map((c) => (
            <CommissionPanel
              key={c.id}
              c={c}
              isOpen={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
              mobileVariant={mobileVariant}
            />
          ))}
        </div>
      )}
    </div>
  );
}
