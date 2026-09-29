import React from 'react';
import { LRH, body, mono } from '@/components/lrh/tokens';

const EXAMPLE = `HCP (Domicile) 10 – 4 Entente SDHC/HHS/AZO (Visiteurs)
Score final : 10 - 4
Buteurs HCP (10 buts) :
Mathieu Ledoux (#18) : 3 buts
Jean Yves Filo (#22) : 2 buts
…
Buteurs Entente (4 buts) :
Alexandre Orange (#17) : 3 buts
Sanctions (Entente) :
Alexandre Orange (#17) : Carton vert
Blessure (HCP) :
Louis Lebeau (#14) : Choc balle cheville

USPG 0 - 8 HCO
USPG : Aucun buteur
Buteurs HCO :
…`;

/**
 * Aide au format, repliée par défaut. Le parseur tolère la décoration
 * Markdown (###, *, **) : un texte copié tel quel depuis un message passe.
 */
export function FormatHelp({ id }: { id: string }) {
  return (
    <details id={id} style={{ marginTop: 10 }}>
      <summary style={{
        ...mono, fontSize: 10.5, fontWeight: 700, color: LRH.navy,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        cursor: 'pointer', padding: '12px 0', minHeight: 44,
      }}>
        Format attendu
      </summary>
      <div style={{
        display: 'grid', gap: 20,
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
        background: '#fff', border: '1px solid ' + LRH.hair, padding: 16,
      }}>
        <pre style={{
          ...mono, fontSize: 12, lineHeight: 1.6, color: LRH.ink,
          margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
        }}>{EXAMPLE}</pre>
        <ul style={{ ...body, fontSize: 13, color: LRH.ink2, lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
          <li>Chaque rencontre commence par <strong>« Équipe A 3 - 1 Équipe B »</strong>, l&apos;équipe qui reçoit en premier. Code court (HCO) ou nom : les deux marchent.</li>
          <li>Les joueurs sont reconnus <strong>au nom</strong>. Le numéro de maillot est facultatif et ne sert qu&apos;à départager deux homonymes.</li>
          <li>Un camp sans but : <strong>« USPG : Aucun buteur »</strong>.</li>
          <li>Cartons : « Carton vert », « Carton jaune » ou « Carton rouge ».</li>
          <li>Pas de minutes : les feuilles ne les portent pas, le site s&apos;en passe.</li>
          <li>Les rencontres doivent déjà exister au calendrier de la journée choisie.</li>
          <li>Les titres, puces et gras (###, *, **) d&apos;un texte copié sont ignorés.</li>
        </ul>
      </div>
    </details>
  );
}
