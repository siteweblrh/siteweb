import { ImageResponse } from 'next/og';
import { OG_SIZE, OG_CONTENT_TYPE, OG_COLORS, OgFrame, OgFooter, OgKicker } from '@/lib/seo/og';

export const alt = 'Ligue Réunionnaise de Hockey — hockey gazon et salle à La Réunion';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OgImage() {
  return new ImageResponse(
    (
      <OgFrame>
        <OgKicker>Site officiel · Saison 2025–2026</OgKicker>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
              marginBottom: 20,
            }}
          >
            Le hockey peï,
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 800,
              color: OG_COLORS.gold,
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
            }}
          >
            officiel.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              color: OG_COLORS.mute,
              marginTop: 32,
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            Calendrier, classements, clubs et actualités du hockey sur gazon et en salle à La Réunion.
          </div>
        </div>
        <OgFooter />
      </OgFrame>
    ),
    { ...size },
  );
}
