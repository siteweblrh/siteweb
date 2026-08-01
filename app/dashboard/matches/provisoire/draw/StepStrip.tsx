'use client';

import React from 'react';
import { LRH, mono, body } from '@/components/lrh/tokens';
import { type Step } from '@/lib/scheduling/competitionState';

export function StepStrip({ steps, current }: { steps: Step[]; current: string }) {
  const COLORS: Record<Step['status'], string> = {
    done: '#1d6b3f',
    doing: '#B45309',
    blocked: LRH.red,
    todo: LRH.mute,
  };
  const MARKS: Record<Step['status'], string> = {
    done: '✓', doing: '⋯', blocked: '!', todo: '·',
  };

  return (
    <ol
      style={{
        listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 14,
        margin: '8px 0 0', padding: 0,
      }}
    >
      {steps.map((s, i) => {
        const isCurrent = s.id === current;
        return (
          <li
            key={s.id}
            aria-current={isCurrent ? 'step' : undefined}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 6,
              opacity: isCurrent || s.status === 'done' ? 1 : 0.7,
            }}
          >
            <span style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.1em' }}>
              {i + 1}
            </span>
            <span
              style={{
                ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: COLORS[s.status],
                textDecoration: isCurrent ? 'underline' : 'none',
                textUnderlineOffset: 3,
              }}
            >
              <span aria-hidden="true">{MARKS[s.status]}</span> {s.label}
            </span>
            <span style={{ ...body, fontSize: 11, color: LRH.mute }}>{s.detail}</span>
          </li>
        );
      })}
    </ol>
  );
}

