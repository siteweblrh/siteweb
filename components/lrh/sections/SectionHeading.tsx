'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, display, body } from '../tokens';

export function SectionHeading({ kicker, title, action, actionHref }: {
  kicker: string;
  title: string;
  action?: string;
  actionHref?: string;
}) {
  const actionStyle: React.CSSProperties = {
    ...body, fontSize: 13, fontWeight: 700, color: LRH.navy, cursor: 'pointer', textDecoration: 'none',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
      <div>
        <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
          {kicker}
        </div>
        <h2
          dangerouslySetInnerHTML={{ __html: title }}
          style={{
            ...display, fontWeight: 700, fontSize: 44,
            lineHeight: 1.05, color: LRH.navy, margin: 0,
            letterSpacing: '-0.03em', maxWidth: 720,
          }}
        />
      </div>
      {action && (
        actionHref ? (
          <Link href={actionHref} style={actionStyle}>
            {action} <span style={{ ...mono, fontSize: 12 }}>→</span>
          </Link>
        ) : (
          <div style={actionStyle}>
            {action} <span style={{ ...mono, fontSize: 12 }}>→</span>
          </div>
        )
      )}
    </div>
  );
}

export function MobileSectionLabel({ kicker, action, actionHref }: {
  kicker: string;
  action?: string;
  actionHref?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        {kicker}
      </div>
      {action && actionHref && (
        <Link href={actionHref} style={{ ...mono, fontSize: 10, color: LRH.navy, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, textDecoration: 'none' }}>
          {action} →
        </Link>
      )}
    </div>
  );
}

export function MobileSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ ...display, fontWeight: 700, fontSize: 30, color: LRH.navy, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
      {children}
    </h2>
  );
}
