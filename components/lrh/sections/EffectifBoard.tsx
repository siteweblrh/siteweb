'use client';

import React, { useMemo, useState } from 'react';
import { LRH, mono, display, body, ClubCrest } from '../tokens';

export type EffectifMember = {
  id: string;
  firstName: string;
  lastName: string;
  kind: 'PLAYER' | 'COACH' | 'STAFF';
  category: 'U11' | 'U14' | 'U17' | 'U19' | 'SENIOR' | 'VETERAN';
  position: string | null;
  jerseyNumber: number | null;
  photo: string | null;
  isFeatured: boolean;
  featuredHeadline: string | null;
  matchesPlayed: number;
  goalsScored: number;
};

export type EffectifClubMeta = {
  name: string;
  shortCode: string | null;
  logo?: string | null;
  primaryColor?: string | null;
};

const CATEGORY_LABEL: Record<EffectifMember['category'], string> = {
  U11: 'U11',
  U14: 'U14',
  U17: 'U17',
  U19: 'U19',
  SENIOR: 'Sénior',
  VETERAN: 'Vétéran',
};

const CATEGORY_ORDER: EffectifMember['category'][] = [
  'U11',
  'U14',
  'U17',
  'U19',
  'SENIOR',
  'VETERAN',
];

function isValidHex(c?: string | null): c is string {
  return typeof c === 'string' && /^#?[0-9a-fA-F]{6}$/.test(c);
}
function normalizeColor(c?: string | null): string {
  if (!isValidHex(c)) return LRH.gold;
  return c.startsWith('#') ? c : '#' + c;
}

function initials(m: EffectifMember) {
  return `${m.firstName[0] ?? ''}${m.lastName[0] ?? ''}`.toUpperCase();
}

export function EffectifBoard({
  members,
  club,
  mobileVariant = false,
}: {
  members: EffectifMember[];
  club: EffectifClubMeta;
  mobileVariant?: boolean;
}) {
  const accent = normalizeColor(club.primaryColor);

  const featured = useMemo(
    () => members.filter((m) => m.kind === 'PLAYER' && m.isFeatured),
    [members],
  );
  const players = useMemo(
    () => members.filter((m) => m.kind === 'PLAYER'),
    [members],
  );
  const coaches = useMemo(
    () => members.filter((m) => m.kind === 'COACH'),
    [members],
  );
  const staff = useMemo(
    () => members.filter((m) => m.kind === 'STAFF'),
    [members],
  );

  const availableCategories = useMemo(() => {
    const set = new Set<EffectifMember['category']>();
    for (const p of players) set.add(p.category);
    return CATEGORY_ORDER.filter((c) => set.has(c));
  }, [players]);

  const [activeCategory, setActiveCategory] = useState<
    EffectifMember['category'] | 'ALL'
  >('ALL');

  const filteredPlayers = useMemo(() => {
    if (activeCategory === 'ALL') return players;
    return players.filter((p) => p.category === activeCategory);
  }, [players, activeCategory]);

  // Group filtered players by category for sub-headings
  const playersByCategory = useMemo(() => {
    const m = new Map<EffectifMember['category'], EffectifMember[]>();
    for (const c of CATEGORY_ORDER) m.set(c, []);
    for (const p of filteredPlayers) m.get(p.category)!.push(p);
    return m;
  }, [filteredPlayers]);

  if (members.length === 0) {
    return (
      <div
        id="effectif"
        style={{
          background: LRH.paperWarm,
          padding: mobileVariant ? '40px 16px' : 'clamp(40px, 5vw, 64px) clamp(20px, 4.5vw, 64px)',
        }}
      >
        <SectionTitle mobileVariant={mobileVariant} accent={LRH.red} />
        <div
          style={{
            marginTop: 16,
            padding: 32,
            background: '#fff',
            border: '1px solid ' + LRH.hair,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 11,
              color: LRH.mute,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            [ effectif non publié ]
          </div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>
            Aucun membre déclaré pour ce club.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="effectif"
      style={{
        background: LRH.paperWarm,
        padding: mobileVariant ? '40px 16px 48px' : 'clamp(43px, 5.40vw, 72px) clamp(20px, 4.5vw, 64px) clamp(38px, 4.80vw, 64px)',
      }}
    >
      <SectionTitle mobileVariant={mobileVariant} accent={accent} />

      {/* Featured */}
      {featured.length > 0 && (
        <div style={{ marginTop: mobileVariant ? 28 : 40 }}>
          <SubHeader kicker="● Mis(es) en avant" color={LRH.gold} />
          <div
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: mobileVariant
                ? '1fr'
                : 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: 18,
            }}
          >
            {featured.map((m) => (
              <FeaturedPlayerCard
                key={m.id}
                member={m}
                club={club}
                accent={accent}
                mobileVariant={mobileVariant}
              />
            ))}
          </div>
        </div>
      )}

      {/* Players */}
      {players.length > 0 && (
        <div style={{ marginTop: mobileVariant ? 36 : 56 }}>
          <SubHeader kicker={`Joueurs · ${players.length}`} color={LRH.navy} />

          {/* Category chips */}
          {availableCategories.length > 1 && (
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <CategoryChip
                label="Toutes"
                active={activeCategory === 'ALL'}
                onClick={() => setActiveCategory('ALL')}
              />
              {availableCategories.map((c) => (
                <CategoryChip
                  key={c}
                  label={CATEGORY_LABEL[c]}
                  active={activeCategory === c}
                  onClick={() => setActiveCategory(c)}
                />
              ))}
            </div>
          )}

          {/* Grouped grid */}
          <div style={{ marginTop: 18 }}>
            {CATEGORY_ORDER.filter((c) => (playersByCategory.get(c)?.length ?? 0) > 0).map(
              (cat) => {
                const list = playersByCategory.get(cat)!;
                return (
                  <div key={cat} style={{ marginBottom: 28 }}>
                    {/* Show sub-heading only when "ALL" is active (otherwise redundant) */}
                    {activeCategory === 'ALL' && availableCategories.length > 1 && (
                      <div
                        style={{
                          ...mono,
                          fontSize: 10,
                          fontWeight: 700,
                          color: LRH.mute,
                          letterSpacing: '0.18em',
                          textTransform: 'uppercase',
                          marginBottom: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span style={{ width: 14, height: 2, background: accent }} />
                        {CATEGORY_LABEL[cat]} · {list.length}
                      </div>
                    )}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: mobileVariant
                          ? 'repeat(auto-fill, minmax(150px, 1fr))'
                          : 'repeat(auto-fill, minmax(210px, 1fr))',
                        gap: mobileVariant ? 10 : 14,
                      }}
                    >
                      {list.map((m) => (
                        <PlayerCard
                          key={m.id}
                          member={m}
                          club={club}
                          accent={accent}
                          mobileVariant={mobileVariant}
                        />
                      ))}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* Coaches */}
      {coaches.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SubHeader kicker={`Encadrement · ${coaches.length}`} color={LRH.red} />
          <StaffGrid members={coaches} club={club} mobileVariant={mobileVariant} kindAccent={LRH.red} />
        </div>
      )}

      {/* Staff */}
      {staff.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SubHeader kicker={`Staff & dirigeants · ${staff.length}`} color="#2c7a3f" />
          <StaffGrid members={staff} club={club} mobileVariant={mobileVariant} kindAccent="#2c7a3f" />
        </div>
      )}
    </div>
  );
}

function SectionTitle({
  mobileVariant,
  accent,
}: {
  mobileVariant: boolean;
  accent: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 28, height: 2, background: accent }} />
        <span
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: LRH.red,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          05 · Effectif
        </span>
      </div>
      <h2
        style={{
          ...display,
          fontWeight: 700,
          fontSize: mobileVariant ? 28 : 38,
          color: LRH.navy,
          margin: 0,
          letterSpacing: '-0.035em',
          lineHeight: 1.05,
        }}
      >
        Les visages<br />du club.
      </h2>
    </div>
  );
}

function SubHeader({ kicker, color }: { kicker: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 18, height: 2, background: color }} />
      <span
        style={{
          ...mono,
          fontSize: 10.5,
          fontWeight: 700,
          color,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}
      >
        {kicker}
      </span>
      <span style={{ flex: 1, height: 1, background: LRH.hair }} />
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...mono,
        fontSize: 10.5,
        fontWeight: 700,
        padding: '7px 14px',
        background: active ? LRH.navy : '#fff',
        color: active ? '#fff' : LRH.navy,
        border: '1px solid ' + (active ? LRH.navy : LRH.hairStrong),
        cursor: 'pointer',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </button>
  );
}

function ClubBadge({ club, size = 22 }: { club: EffectifClubMeta; size?: number }) {
  if (club.logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={club.logo}
        alt={`${club.name} logo`}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          background: '#fff',
          padding: 2,
          border: '1px solid ' + LRH.hair,
          flexShrink: 0,
        }}
      />
    );
  }
  return <ClubCrest id={club.shortCode ?? undefined} size={size} noLink />;
}

function PhotoOrInitials({
  member,
  height,
  rounded = false,
}: {
  member: EffectifMember;
  height: number | string;
  rounded?: boolean;
}) {
  if (member.photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.photo}
        alt={`${member.firstName} ${member.lastName}`}
        style={{
          width: '100%',
          height,
          objectFit: 'cover',
          display: 'block',
          borderRadius: rounded ? 4 : 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: '100%',
        height,
        background:
          'linear-gradient(135deg, ' + LRH.navy + ' 0%, #001022 100%)',
        color: LRH.gold,
        ...display,
        fontWeight: 800,
        fontSize: typeof height === 'number' ? Math.max(28, height * 0.4) : 48,
        letterSpacing: '-0.04em',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: rounded ? 4 : 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(112deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 22px)',
          pointerEvents: 'none',
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{initials(member)}</span>
    </div>
  );
}

function PlayerCard({
  member,
  club,
  accent,
  mobileVariant,
}: {
  member: EffectifMember;
  club: EffectifClubMeta;
  accent: string;
  mobileVariant: boolean;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderTop: `3px solid ${accent}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 8px 24px rgba(0,34,68,0.10)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ position: 'relative' }}>
        <PhotoOrInitials
          member={member}
          height={mobileVariant ? 170 : 220}
        />
        {member.jerseyNumber != null && (
          <div
            style={{
              position: 'absolute',
              left: 10,
              bottom: 10,
              ...display,
              fontWeight: 800,
              fontSize: mobileVariant ? 24 : 30,
              letterSpacing: '-0.05em',
              color: LRH.navy,
              background: LRH.gold,
              padding: '4px 10px',
              lineHeight: 1,
            }}
          >
            {member.jerseyNumber}
          </div>
        )}
        <div style={{ position: 'absolute', right: 10, top: 10 }}>
          <ClubBadge club={club} size={mobileVariant ? 22 : 26} />
        </div>
      </div>

      <div style={{ padding: mobileVariant ? '12px 12px 14px' : '14px 14px 16px' }}>
        <div
          style={{
            ...display,
            fontWeight: 700,
            fontSize: mobileVariant ? 14 : 16,
            color: LRH.navy,
            letterSpacing: '-0.015em',
            lineHeight: 1.15,
            minHeight: mobileVariant ? 32 : 36,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {member.firstName} {member.lastName}
        </div>
        <div
          style={{
            ...mono,
            fontSize: 9.5,
            color: LRH.mute,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginTop: 4,
            fontWeight: 700,
          }}
        >
          {member.position || CATEGORY_LABEL[member.category]}
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px dashed ' + LRH.hair,
            display: 'flex',
            gap: 14,
          }}
        >
          <PlayerStat label="MJ" value={member.matchesPlayed} color={LRH.navy} />
          <PlayerStat label="BUTS" value={member.goalsScored} color={LRH.red} />
        </div>
      </div>
    </div>
  );
}

function PlayerStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          ...display,
          fontWeight: 800,
          fontSize: 22,
          color,
          letterSpacing: '-0.035em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          ...mono,
          fontSize: 8.5,
          color: LRH.mute,
          letterSpacing: '0.18em',
          marginTop: 3,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FeaturedPlayerCard({
  member,
  club,
  accent,
  mobileVariant,
}: {
  member: EffectifMember;
  club: EffectifClubMeta;
  accent: string;
  mobileVariant: boolean;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        display: 'grid',
        gridTemplateColumns: mobileVariant ? '1fr' : '180px 1fr',
        overflow: 'hidden',
        position: 'relative',
        borderTop: `4px solid ${LRH.gold}`,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 10px 28px rgba(243,188,28,0.18)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Photo */}
      <div style={{ position: 'relative' }}>
        <PhotoOrInitials
          member={member}
          height={mobileVariant ? 220 : '100%'}
        />
        {member.jerseyNumber != null && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              ...display,
              fontWeight: 800,
              fontSize: mobileVariant ? 30 : 36,
              letterSpacing: '-0.05em',
              color: LRH.navy,
              background: LRH.gold,
              padding: '4px 12px',
              lineHeight: 1,
            }}
          >
            {member.jerseyNumber}
          </div>
        )}
      </div>

      {/* Right panel — navy with stripe pattern */}
      <div
        style={{
          background: LRH.navy,
          color: '#fff',
          padding: mobileVariant ? '20px 18px 22px' : '22px 24px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 26px)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                ...mono,
                fontSize: 9.5,
                fontWeight: 800,
                color: LRH.navy,
                background: LRH.gold,
                padding: '3px 8px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              ● À la une
            </span>
            <ClubBadge club={club} size={22} />
          </div>
          <div
            style={{
              ...display,
              fontWeight: 800,
              fontSize: mobileVariant ? 22 : 28,
              color: '#fff',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
            }}
          >
            {member.firstName}<br />{member.lastName}
          </div>
          <div
            style={{
              ...mono,
              fontSize: 10.5,
              color: accent,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginTop: 8,
              fontWeight: 700,
            }}
          >
            {member.position || CATEGORY_LABEL[member.category]}
            {member.position && (
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                {' · '}
                {CATEGORY_LABEL[member.category]}
              </span>
            )}
          </div>
          {member.featuredHeadline && (
            <div
              style={{
                ...body,
                fontSize: mobileVariant ? 13 : 14,
                color: 'rgba(255,255,255,0.78)',
                lineHeight: 1.5,
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px dashed rgba(255,255,255,0.16)',
                fontStyle: 'italic',
              }}
            >
              « {member.featuredHeadline} »
            </div>
          )}
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px dashed rgba(255,255,255,0.16)',
              display: 'flex',
              gap: 22,
            }}
          >
            <FeaturedStat label="Matchs joués" value={member.matchesPlayed} />
            <FeaturedStat label="Buts marqués" value={member.goalsScored} accent />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          ...display,
          fontWeight: 800,
          fontSize: 34,
          color: accent ? LRH.gold : '#fff',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          ...mono,
          fontSize: 9.5,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginTop: 6,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function StaffGrid({
  members,
  club,
  mobileVariant,
  kindAccent,
}: {
  members: EffectifMember[];
  club: EffectifClubMeta;
  mobileVariant: boolean;
  kindAccent: string;
}) {
  return (
    <div
      style={{
        marginTop: 14,
        display: 'grid',
        gridTemplateColumns: mobileVariant
          ? 'repeat(auto-fill, minmax(160px, 1fr))'
          : 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: mobileVariant ? 10 : 14,
      }}
    >
      {members.map((m) => (
        <StaffCard
          key={m.id}
          member={m}
          club={club}
          accent={kindAccent}
          mobileVariant={mobileVariant}
        />
      ))}
    </div>
  );
}

function StaffCard({
  member,
  club,
  accent,
  mobileVariant,
}: {
  member: EffectifMember;
  club: EffectifClubMeta;
  accent: string;
  mobileVariant: boolean;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${accent}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 6px 18px rgba(0,34,68,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          width: mobileVariant ? 50 : 60,
          height: mobileVariant ? 50 : 60,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <PhotoOrInitials member={member} height={mobileVariant ? 50 : 60} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            ...display,
            fontWeight: 700,
            fontSize: mobileVariant ? 13.5 : 14.5,
            color: LRH.navy,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {member.firstName} {member.lastName}
        </div>
        {member.position && (
          <div
            style={{
              ...mono,
              fontSize: 9.5,
              color: LRH.mute,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginTop: 3,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {member.position}
          </div>
        )}
      </div>
      <ClubBadge club={club} size={20} />
    </div>
  );
}
