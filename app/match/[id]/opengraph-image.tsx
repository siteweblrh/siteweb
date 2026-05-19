import { ImageResponse } from 'next/og';
import { getMatchPublic } from '@/lib/queries/match';
import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  OG_COLORS,
  OG_DIAGONAL_STRIPES,
  OG_GOLD_SPOTLIGHT,
  OgFooter,
} from '@/lib/seo/og';

export const alt = 'Match — Ligue Réunionnaise de Hockey';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function MatchOgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatchPublic(id);

  if (!match) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: OG_COLORS.navy,
            color: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
            fontWeight: 800,
          }}
        >
          Ligue Réunionnaise de Hockey
        </div>
      ),
      { ...size },
    );
  }

  const dateLabel = match.kickoffAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const timeLabel = match.kickoffAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const hasScore = match.homeScore != null && match.awayScore != null;
  const modeLabel = match.competition.mode === 'GAZON' ? 'Gazon' : 'Salle';
  const modeColor = match.competition.mode === 'GAZON' ? '#1d6b3f' : OG_COLORS.red;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: OG_COLORS.navy,
          backgroundImage: `${OG_GOLD_SPOTLIGHT}, ${OG_DIAGONAL_STRIPES}`,
          color: '#fff',
          padding: '56px 64px',
        }}
      >
        {/* Header : compétition + saison + mode */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              padding: '6px 14px',
              background: modeColor,
              color: '#fff',
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {modeLabel}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              color: OG_COLORS.gold,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            {match.competition.season}
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: OG_COLORS.mute }}>
            · {match.competition.name}
          </div>
        </div>

        {/* Corps : Home vs Away avec score */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 28,
          }}
        >
          {/* Home team */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                color: OG_COLORS.mute,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Domicile
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 52,
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                textAlign: 'center',
              }}
            >
              {match.homeClub.shortCode ?? match.homeClub.name}
            </div>
          </div>

          {/* Score / VS */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0 24px',
            }}
          >
            {hasScore ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 120,
                  fontWeight: 800,
                  color: OG_COLORS.gold,
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                <span style={{ display: 'flex' }}>{match.homeScore}</span>
                <span
                  style={{
                    display: 'flex',
                    color: '#fff',
                    margin: '0 18px',
                    fontWeight: 400,
                  }}
                >
                  :
                </span>
                <span style={{ display: 'flex' }}>{match.awayScore}</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  fontSize: 96,
                  fontWeight: 800,
                  color: OG_COLORS.gold,
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                VS
              </div>
            )}
            <div
              style={{
                display: 'flex',
                marginTop: 18,
                fontSize: 20,
                color: OG_COLORS.mute,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {dateLabel} · {timeLabel}
            </div>
          </div>

          {/* Away team */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                color: OG_COLORS.mute,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              Visiteur
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 52,
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                textAlign: 'center',
              }}
            >
              {match.awayClub.shortCode ?? match.awayClub.name}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', marginTop: 24 }}>
          <OgFooter />
        </div>
      </div>
    ),
    { ...size },
  );
}
