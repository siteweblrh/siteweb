import React from 'react';
import { LRH, body, mono } from '@/components/lrh/tokens';

/**
 * Styles des formulaires d'admin de la rubrique jeunes, partagés par les
 * écrans rassemblements et jeunes arbitres (auparavant locaux au premier).
 */

export const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 13,
  padding: '9px 11px',
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
};

export const btnPrimary: React.CSSProperties = {
  ...body, fontSize: 12, fontWeight: 700,
  padding: '10px 16px', borderRadius: 4,
  background: LRH.navy, color: '#fff',
  border: 'none', cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};

export const btnGhost: React.CSSProperties = {
  ...body, fontSize: 11.5, fontWeight: 700,
  padding: '7px 12px', borderRadius: 4,
  background: 'transparent', color: LRH.ink2,
  border: '1px solid ' + LRH.hairStrong, cursor: 'pointer',
  letterSpacing: '0.06em', textTransform: 'uppercase',
  minHeight: 36,
};

export const btnDanger: React.CSSProperties = {
  ...btnGhost,
  color: LRH.red,
  border: '1px solid ' + LRH.red,
};

/** `htmlFor` relie le libellé à son champ (lecteurs d'écran, clic sur le libellé). */
export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{
      ...mono, fontSize: 10, fontWeight: 700,
      color: LRH.mute, letterSpacing: '0.14em',
      textTransform: 'uppercase', display: 'block', marginBottom: 6,
    }}>{children}</label>
  );
}
