'use client';

import React, { useEffect, useState } from 'react';
import {
  LRH, mono, display, body,
  ClubCrest, CTAButton, Card
} from './tokens';
import { signOut } from 'next-auth/react';
import { LrhMark } from './tokens';

function useDashIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return m;
}
import {
  IconGrid, IconMegaphone, IconHockey, IconPodium, IconUsers,
  IconHandshake, IconBriefcase, IconNetwork, IconTrophy,
  IconLogout, IconPin, IconWhistle, IconIdCard, IconFolder, IconStar,
  IconWallet,
} from './Icons';

interface DashSidebarProps {
  active?: string;
  club: any;
  isAdmin?: boolean;
  counts: {
    news: number;
    members: number;
  };
}

type SidebarItem = {
  id: string;
  label: string;
  kbd?: string;
  count?: number;
  icon: React.ComponentType<{ size?: number }>;
};

type SidebarSection = {
  label?: string;
  items: SidebarItem[];
};

// Mapping centralisé id → href (partagé par les deux sidebars).
function hrefFor(id: string): string {
  switch (id) {
    case 'overview':            return '/dashboard';
    case 'actus':               return '/dashboard';
    case 'profile':             return '/dashboard/club/profile';
    case 'matches':             return '/dashboard/matches';
    case 'calendar':            return '/dashboard/matches/calendar';
    case 'standings':           return '/dashboard/standings';
    case 'team':                return '/dashboard/team';
    case 'venues':              return '/dashboard/venues';
    case 'ligue-competitions':  return '/dashboard/competitions';
    case 'ligue-clubs':         return '/dashboard/ligue/clubs';
    case 'ligue-venues':        return '/dashboard/ligue/venues';
    case 'ligue-arbitres':      return '/dashboard/ligue/arbitres';
    case 'ligue-bureau':        return '/dashboard/ligue/bureau';
    case 'ligue-commissions':   return '/dashboard/ligue/commissions';
    case 'ligue-mvp':           return '/dashboard/ligue/mvp';
    case 'ligue-sponsors':      return '/dashboard/ligue/sponsors';
    case 'ligue-contenu':       return '/dashboard/ligue/contenu';
    case 'ligue-users':         return '/dashboard/ligue/users';
    case 'ligue-audit':         return '/dashboard/ligue/audit';
    case 'ligue-news':          return '/dashboard/news';
    default:                    return '/dashboard';
  }
}

function DashSidebar({ active = 'actus', club, counts, isAdmin = false }: DashSidebarProps) {
  // Items côté manager d'un club (jamais montrés à l'admin) — pas de groupement
  // côté club, peu d'items donc une seule section sans sous-titre.
  const clubSections: SidebarSection[] = [{
    items: [
      { id: 'overview',  label: 'Tableau de bord', kbd: 'D', icon: IconGrid },
      { id: 'profile',   label: 'Profil du club',  kbd: 'P', icon: IconIdCard },
      { id: 'actus',     label: 'Actualités',      kbd: 'A', count: counts.news, icon: IconMegaphone },
      { id: 'matches',   label: 'Mes matchs',      kbd: 'M', icon: IconHockey },
      { id: 'standings', label: 'Classements',     kbd: 'C', icon: IconPodium },
      { id: 'team',      label: 'Effectif',        kbd: 'E', icon: IconUsers },
      { id: 'venues',    label: 'Mes terrains',    kbd: 'V', icon: IconPin },
    ],
  }];

  // Admin LRH — 6 sections logiques pour éviter une liste plate de 16 items.
  // L'ordre va du sportif (cœur métier quotidien) → gouvernance → comms → système.
  const adminSections: SidebarSection[] = [
    {
      items: [
        { id: 'overview', label: 'Tableau de bord', icon: IconGrid },
      ],
    },
    {
      label: 'Compétition',
      items: [
        { id: 'calendar',           label: 'Calendrier',   icon: IconGrid },
        { id: 'matches',            label: 'Matchs',       icon: IconHockey },
        { id: 'standings',          label: 'Classements',  icon: IconPodium },
        { id: 'ligue-competitions', label: 'Compétitions', icon: IconTrophy },
      ],
    },
    {
      label: 'Acteurs',
      items: [
        { id: 'ligue-clubs',    label: 'Clubs & ententes', icon: IconHandshake },
        { id: 'ligue-venues',   label: 'Terrains',         icon: IconPin },
        { id: 'ligue-arbitres', label: 'Arbitres',         icon: IconWhistle },
      ],
    },
    {
      label: 'Ligue',
      items: [
        { id: 'ligue-bureau',      label: 'Bureau exécutif', icon: IconBriefcase },
        { id: 'ligue-commissions', label: 'Commissions',     icon: IconNetwork },
        { id: 'ligue-sponsors',    label: 'Sponsors',        icon: IconWallet },
      ],
    },
    {
      label: 'Communication',
      items: [
        { id: 'ligue-news',    label: 'Actualités',      icon: IconMegaphone },
        { id: 'ligue-mvp',     label: 'Joueur du mois',  icon: IconStar },
        { id: 'ligue-contenu', label: 'Contenu du site', icon: IconFolder },
      ],
    },
    {
      label: 'Système',
      items: [
        { id: 'ligue-users', label: 'Comptes',          icon: IconUsers },
        { id: 'ligue-audit', label: "Journal d'audit",  icon: IconFolder },
      ],
    },
  ];

  const sections = isAdmin ? adminSections : clubSections;
  const sectionLabel = isAdmin ? 'Administration ligue' : 'Gestion du club';
  const sectionAccent = isAdmin ? LRH.gold : 'rgba(255,255,255,0.4)';
  const activeBg = isAdmin ? LRH.gold : LRH.red;
  const activeFg = isAdmin ? LRH.navy : '#fff';

  return (
    <div style={{
      width: 252, background: LRH.navy, color: '#fff',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ padding: '22px 22px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LrhMark size={32} white />
            <div style={{ ...display, lineHeight: 1.05 }}>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.01em' }}>
                {isAdmin ? 'Portail Ligue' : 'Portail Clubs'}
              </div>
              <div style={{ ...mono, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginTop: 3 }}>LRH · v 2.4</div>
            </div>
          </div>
        </Link>
        {isAdmin ? (
          <div style={{
            marginTop: 18, padding: 12, borderRadius: 10,
            background: 'rgba(243,188,28,0.10)',
            border: '1px solid rgba(243,188,28,0.25)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, background: LRH.gold,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: LRH.navy, ...display, fontWeight: 800, fontSize: 12,
              letterSpacing: '0.04em', borderRadius: 2,
            }}>
              LRH
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...display, fontWeight: 700, fontSize: 13, color: '#fff' }}>Administration</div>
              <div style={{ ...mono, fontSize: 9, color: LRH.gold, letterSpacing: '0.12em', marginTop: 2, textTransform: 'uppercase' }}>
                Mode ligue
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: 18, padding: 12, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <ClubCrest id={club?.id?.toUpperCase()} initials={club?.name?.substring(0,2)} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...display, fontWeight: 700, fontSize: 13 }}>{club?.name || 'Chargement...'}</div>
              <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginTop: 2 }}>{club?.city || '—'}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '18px 14px', flex: 1, overflowY: 'auto' }}>
        <div style={{
          ...mono, fontSize: 9, color: sectionAccent,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          padding: '0 8px 8px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {isAdmin && <span style={{ width: 5, height: 5, background: LRH.gold }} />}
          {sectionLabel}
        </div>
        {sections.map((section, sectionIdx) => (
          <div key={section.label ?? `__s${sectionIdx}`} style={{ marginBottom: 10 }}>
            {section.label && (
              <div style={{
                ...mono, fontSize: 8.5, color: 'rgba(255,255,255,0.42)',
                letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700,
                padding: '10px 10px 6px',
              }}>
                {section.label}
              </div>
            )}
            {section.items.map((it) => {
              const isActive = it.id === active;
              const Icon = it.icon;
              return (
                <Link key={it.id} href={hrefFor(it.id)} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 10px', borderRadius: 8,
                    background: isActive ? activeBg : 'transparent',
                    color: isActive ? activeFg : 'rgba(255,255,255,0.78)',
                    ...body, fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer', marginBottom: 2,
                  }}>
                    <div style={{
                      width: 22, height: 22, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isActive
                        ? activeFg
                        : isAdmin ? LRH.gold : 'rgba(255,255,255,0.55)',
                    }}>
                      <Icon size={16} />
                    </div>
                    <span style={{ flex: 1 }}>{it.label}</span>
                    {it.count != null && (
                      <span style={{
                        ...mono, fontSize: 9, letterSpacing: '0.04em',
                        background: isActive ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.08)',
                        padding: '2px 7px', borderRadius: 999, fontWeight: 700,
                      }}>{it.count}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={() => signOut()}
          style={{
            width: '100%', padding: '10px', borderRadius: 8,
            background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.1)', ...mono, fontSize: 10,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <IconLogout size={13} />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

function DashHeader({
  title,
  userName,
  onMenuClick,
}: {
  title: string;
  userName?: string | null;
  onMenuClick?: () => void;
}) {
  return (
    <div style={{
      padding: 'clamp(12px, 2vw, 16px) clamp(16px, 3vw, 32px)',
      borderBottom: '1px solid ' + LRH.hair,
      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Ouvrir le menu"
            style={{
              width: 38, height: 38,
              background: LRH.paperWarm,
              border: '1px solid ' + LRH.hairStrong,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, cursor: 'pointer', padding: 0,
              flexShrink: 0,
            }}
          >
            <span style={{ width: 16, height: 2, background: LRH.navy }} />
            <span style={{ width: 16, height: 2, background: LRH.navy }} />
            <span style={{ width: 16, height: 2, background: LRH.navy }} />
          </button>
        )}
        <h1 style={{
          ...display, fontWeight: 700,
          fontSize: 'clamp(15px, 2vw, 20px)',
          color: LRH.navy, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2vw, 24px)', flexShrink: 0 }}>
        <div style={{
          ...body, fontSize: 13, color: LRH.mute, fontWeight: 600,
          display: 'none',
        }} className="dash-username-md">
          {userName}
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: LRH.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: LRH.navy, ...display, fontWeight: 800, fontSize: 12 }}>
          {userName?.substring(0, 1)}
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

function AdminOverview() {
  const quickLinks: { id: string; label: string; desc: string; icon: React.ComponentType<{ size?: number }>; href: string }[] = [
    { id: 'calendar',           label: 'Calendrier',       desc: 'Vue mensuelle de tous les matchs, création et édition au clic.',          icon: IconGrid,      href: '/dashboard/matches/calendar' },
    { id: 'matches',            label: 'Matchs',           desc: 'Liste détaillée groupée par compétition, scores et arbitres.',           icon: IconHockey,    href: '/dashboard/matches' },
    { id: 'ligue-news',         label: 'Nouvelle actualité', desc: 'Publier un article : résultats, communiqués, événements.',             icon: IconMegaphone, href: '/dashboard/news/new' },
    { id: 'standings',          label: 'Classements',      desc: 'Classements officiels recalculés automatiquement à chaque match.',       icon: IconPodium,    href: '/dashboard/standings' },
    { id: 'ligue-competitions', label: 'Compétitions',     desc: 'Créez et configurez les compétitions de la saison.',                     icon: IconTrophy,    href: '/dashboard/competitions' },
    { id: 'ligue-clubs',        label: 'Clubs & ententes', desc: 'Annuaire des clubs affiliés et gestion des ententes.',                   icon: IconHandshake, href: '/dashboard/ligue/clubs' },
  ];

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
      <div style={{ marginBottom: 'clamp(20px, 3vw, 28px)' }}>
        <div style={{
          ...mono, fontSize: 11, color: LRH.red,
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
        }}>
          Administration · Tableau de bord
        </div>
        <h2 style={{
          ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy,
          margin: 0, letterSpacing: '-0.02em',
        }}>
          Console ligue.
        </h2>
        <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '8px 0 0', maxWidth: 720 }}>
          Pilotage complet de la saison : matchs, compétitions, classements et annuaires. Accès rapides ci-dessous, navigation complète dans le menu.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
        {quickLinks.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.id} href={q.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#fff',
                border: '1px solid ' + LRH.hair,
                borderLeft: `3px solid ${LRH.gold}`,
                padding: '18px 18px 16px',
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
                }}>
                  <div style={{
                    width: 28, height: 28, background: LRH.navy,
                    color: LRH.gold,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={15} />
                  </div>
                  <div style={{
                    ...display, fontWeight: 700, fontSize: 16, color: LRH.navy,
                    letterSpacing: '-0.01em',
                  }}>
                    {q.label}
                  </div>
                </div>
                <p style={{ ...body, fontSize: 12.5, color: LRH.mute, margin: 0, lineHeight: 1.45 }}>
                  {q.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function HomeDashboardDesktop({ club, news, metrics, user, activeTab = 'actus', isAdmin = false, children }: any) {
  const isMobile = useDashIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fermer le drawer au resize vers desktop + bloquer scroll body quand ouvert.
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  const sidebar = (
    <DashSidebar
      active={activeTab}
      club={club}
      isAdmin={isAdmin}
      counts={{ news: metrics.newsCount, members: metrics.membersCount }}
    />
  );

  return (
    // `overflow-x: hidden` au niveau racine : aucune page enfant ne peut faire
    // déborder le document horizontalement (les tables/grids qui débordent
    // doivent gérer leur propre overflow-x: auto sandboxé).
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', background: LRH.paper, overflowX: 'hidden' }}>
      {/* Sidebar desktop : inline */}
      {!isMobile && sidebar}

      {/* Sidebar mobile : drawer overlay */}
      {isMobile && drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 40,
              animation: 'lrh-dash-fade 0.2s ease-out',
            }}
          />
          <div
            style={{
              position: 'fixed', left: 0, top: 0, bottom: 0,
              zIndex: 50,
              animation: 'lrh-dash-slide 0.22s ease-out',
              boxShadow: '12px 0 32px rgba(0,0,0,0.24)',
            }}
          >
            {/* Bouton close INTERNE au drawer (top: 10, right: 10) — l'ancien
                placement à right: -42 débordait la zone tactile hors du drawer
                et créait du scroll horizontal sur viewports étroits. */}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Fermer le menu"
              style={{
                position: 'absolute',
                top: 10, right: 10,
                width: 36, height: 36,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                cursor: 'pointer',
                ...mono, fontWeight: 700, fontSize: 16,
                color: '#fff',
                zIndex: 2,
              }}
            >
              ✕
            </button>
            {sidebar}
          </div>
          <style jsx>{`
            @keyframes lrh-dash-fade {
              from { opacity: 0; } to { opacity: 1; }
            }
            @keyframes lrh-dash-slide {
              from { transform: translateX(-100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowX: 'hidden' }}>
        <DashHeader
          title={
            activeTab === 'actus' ? "Actualités du Club"
            : activeTab === 'profile' ? "Profil du club"
            : activeTab === 'team' ? "Effectif du club"
            : activeTab === 'matches' ? (isAdmin ? "Ligue — Matchs" : "Mes matchs")
            : activeTab === 'calendar' ? "Ligue — Calendrier"
            : activeTab === 'standings' ? (isAdmin ? "Ligue — Classements" : "Classements")
            : activeTab === 'venues' ? "Mes terrains"
            : activeTab === 'ligue-clubs' ? "Ligue — Clubs & ententes"
            : activeTab === 'ligue-users' ? "Ligue — Comptes"
            : activeTab === 'ligue-competitions' ? "Ligue — Compétitions"
            : activeTab === 'ligue-venues' ? "Ligue — Terrains"
            : activeTab === 'ligue-arbitres' ? "Ligue — Arbitres"
            : activeTab === 'ligue-bureau' ? "Ligue — Bureau exécutif"
            : activeTab === 'ligue-commissions' ? "Ligue — Commissions"
            : activeTab === 'ligue-mvp' ? "Ligue — Joueur du mois"
            : activeTab === 'ligue-sponsors' ? "Ligue — Sponsors & partenaires"
            : activeTab === 'ligue-contenu' ? "Ligue — Contenu du site"
            : activeTab === 'ligue-audit' ? "Ligue — Journal d'audit"
            : activeTab === 'ligue-news' ? "Ligue — Actualités"
            : (isAdmin ? "Tableau de bord — Ligue" : "Tableau de bord")
          }
          userName={user?.name}
          onMenuClick={isMobile ? () => setDrawerOpen(true) : undefined}
        />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
          {children || (isAdmin ? (
            <AdminOverview />
          ) : (
            <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Communication
                  </div>
                  <h2 style={{ ...display, fontWeight: 700, fontSize: 'clamp(22px, 4vw, 32px)', color: LRH.navy, margin: 0 }}>Gérer vos actualités.</h2>
                </div>
                <Link href="/dashboard/news/new">
                  <CTAButton variant="red">Nouvel article</CTAButton>
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 20 }}>
                {news.map((it: any, i: number) => (
                  <Card key={it.id || i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{
                        padding: '4px 8px', borderRadius: 4, background: LRH.paperWarm,
                        ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.06em',
                      }}>Article</div>
                      <div style={{ ...mono, fontSize: 10, color: it.published ? '#10b981' : LRH.mute }}>
                        {it.published ? 'En ligne' : 'Brouillon'}
                      </div>
                    </div>
                    <h3 style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy, margin: '0 0 8px' }}>{it.title}</h3>
                    <p style={{ ...body, fontSize: 13, color: LRH.mute }}>
                      {new Date(it.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid ' + LRH.hair, display: 'flex', gap: 12 }}>
                      <span style={{ ...body, fontSize: 12.5, fontWeight: 600, color: LRH.navy, cursor: 'pointer' }}>Modifier</span>
                      <span style={{ ...body, fontSize: 12.5, fontWeight: 600, color: LRH.mute, cursor: 'pointer' }}>Statistiques</span>
                    </div>
                  </Card>
                ))}
                {news.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px dashed ' + LRH.hair }}>
                    <div style={{ ...display, fontSize: 16, color: LRH.mute }}>Aucune actualité pour le moment.</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
