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

export const alt = 'Actualité — Ligue Réunionnaise de Hockey';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const CATEGORY_LABEL: Record<string, string> = {
  ACTUALITE: 'Actualité',
  RESULTAT: 'Résultat',
  EVENEMENT: 'Événement',
  COMMUNIQUE: 'Communiqué',
};

const CATEGORY_COLOR: Record<string, string> = {
  ACTUALITE: OG_COLORS.gold,
  RESULTAT: '#1d6b3f',
  EVENEMENT: OG_COLORS.gold,
  COMMUNIQUE: OG_COLORS.red,
};

export default async function NewsOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await prisma.news.findFirst({
    where: { slug, published: true },
    select: { title: true, category: true, coverImage: true, publishedAt: true, createdAt: true },
  });

  // Fallback : si l'article n'existe pas, on rend le bandeau LRH générique.
  if (!article) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: OG_COLORS.navy,
            backgroundImage: `${OG_GOLD_SPOTLIGHT}, ${OG_DIAGONAL_STRIPES}`,
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

  const categoryLabel = CATEGORY_LABEL[article.category] ?? article.category;
  const categoryColor = CATEGORY_COLOR[article.category] ?? OG_COLORS.gold;
  const publishedDate = article.publishedAt ?? article.createdAt;
  const dateLabel = publishedDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: OG_COLORS.navy,
          color: '#fff',
        }}
      >
        {/* Colonne gauche : cover ou pattern */}
        <div
          style={{
            display: 'flex',
            width: '45%',
            height: '100%',
            background: article.coverImage
              ? `url(${article.coverImage}) center / cover no-repeat`
              : `${OG_DIAGONAL_STRIPES}, ${OG_COLORS.navyDeep}`,
            borderRight: `8px solid ${categoryColor}`,
          }}
        />

        {/* Colonne droite : meta + titre + footer */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '55%',
            padding: '52px 56px',
            backgroundImage: OG_GOLD_SPOTLIGHT,
          }}
        >
          <OgKicker color={categoryColor}>{categoryLabel}</OgKicker>

          <div
            style={{
              display: 'flex',
              flex: 1,
              fontSize: 56,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              overflow: 'hidden',
            }}
          >
            {article.title}
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 18,
              color: OG_COLORS.mute,
              letterSpacing: '0.08em',
              marginTop: 18,
              marginBottom: 24,
            }}
          >
            {dateLabel.toUpperCase()}
          </div>

          <OgFooter />
        </div>
      </div>
    ),
    { ...size },
  );
}
