import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  OG_COLORS,
  OG_DIAGONAL_STRIPES,
  OG_GOLD_SPOTLIGHT,
  OgFooter,
  OgKicker,
} from '@/lib/seo/og';

export const alt = 'Club — Ligue Réunionnaise de Hockey';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function ClubOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await prisma.club.findUnique({
    where: { slug },
    select: {
      name: true,
      shortCode: true,
      city: true,
      foundedYear: true,
      kind: true,
      logo: true,
      primaryColor: true,
    },
  });

  if (!club) {
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

  const accent = club.primaryColor ?? OG_COLORS.gold;
  const kicker = club.kind === 'ENTENTE' ? 'Entente affiliée LRH' : 'Club affilié LRH';

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
          padding: '60px 64px',
          position: 'relative',
        }}
      >
        {/* Bande verticale accent gauche */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 12,
            height: '100%',
            background: accent,
            display: 'flex',
          }}
        />

        <OgKicker color={OG_COLORS.gold}>{kicker}</OgKicker>

        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            gap: 48,
          }}
        >
          {/* Crest / cartouche */}
          {club.logo ? (
            <div
              style={{
                display: 'flex',
                width: 220,
                height: 220,
                background: `url(${club.logo}) center / contain no-repeat #fff`,
                border: `4px solid ${accent}`,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: 220,
                height: 220,
                background: accent,
                color: OG_COLORS.navy,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 72,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                flexShrink: 0,
              }}
            >
              {(club.shortCode ?? club.name.substring(0, 3)).toUpperCase()}
            </div>
          )}

          {/* Bloc texte */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 72,
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1,
                letterSpacing: '-0.035em',
                marginBottom: 18,
              }}
            >
              {club.name}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 18,
                fontSize: 28,
                color: OG_COLORS.mute,
                letterSpacing: '0.06em',
              }}
            >
              <span style={{ display: 'flex', textTransform: 'uppercase' }}>{club.city}</span>
              {club.foundedYear && (
                <>
                  <span style={{ display: 'flex', color: OG_COLORS.gold, opacity: 0.6 }}>·</span>
                  <span style={{ display: 'flex' }}>Fondé en {club.foundedYear}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <OgFooter />
      </div>
    ),
    { ...size },
  );
}
