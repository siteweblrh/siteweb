'use client';

import React from 'react';
import {
  LRH, mono, display, body,
  ClubCrest, CTAButton, Card
} from './tokens';
import { signOut } from 'next-auth/react';
import { LrhMark } from './tokens';
import {
  IconGrid, IconMegaphone, IconHockey, IconPodium, IconIdCard, IconUsers,
  IconFolder, IconHandshake, IconWallet, IconBriefcase, IconNetwork, IconTrophy,
  IconLogout,
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

function DashSidebar({ active = 'actus', club, counts, isAdmin = false }: DashSidebarProps) {
  const clubItems: SidebarItem[] = [
    { id: 'overview',  label: 'Tableau de bord', kbd: 'D', icon: IconGrid },
    { id: 'actus',     label: 'Actualités',      kbd: 'A', count: counts.news, icon: IconMegaphone },
    { id: 'matches',   label: 'Matchs',          kbd: 'M', icon: IconHockey },
    { id: 'standings', label: 'Classements',     kbd: 'C', icon: IconPodium },
    { id: 'licen',     label: 'Licenciés',       kbd: 'L', count: counts.members, icon: IconIdCard },
    { id: 'team',      label: 'Effectif',        kbd: 'E', icon: IconUsers },
    { id: 'docs',      label: 'Documents',       kbd: 'O', icon: IconFolder },
    { id: 'sponsors',  label: 'Partenaires',     kbd: 'P', icon: IconHandshake },
    { id: 'billing',   label: 'Trésorerie',      kbd: 'T', icon: IconWallet },
  ];
  const ligueItems: SidebarItem[] = [
    { id: 'ligue-competitions', label: 'Compétitions',     icon: IconTrophy },
    { id: 'ligue-bureau',       label: 'Bureau exécutif',  icon: IconBriefcase },
    { id: 'ligue-commissions',  label: 'Commissions',      icon: IconNetwork },
  ];

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
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.01em' }}>Portail Clubs</div>
              <div style={{ ...mono, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginTop: 3 }}>LRH · v 2.4</div>
            </div>
          </div>
        </Link>
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
      </div>

      <div style={{ padding: '18px 14px', flex: 1, overflowY: 'auto' }}>
        <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '0 8px 8px' }}>
          Gestion du club
        </div>
        {clubItems.map((it) => {
          const isActive = it.id === active;
          const href = it.id === 'overview' ? '/dashboard' : it.id === 'actus' ? '/dashboard' : `/dashboard/${it.id}`;
          const Icon = it.icon;
          return (
            <Link key={it.id} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 10px', borderRadius: 8,
                background: isActive ? LRH.red : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.78)',
                ...body, fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                cursor: 'pointer', marginBottom: 2,
              }}>
                <div style={{
                  width: 22, height: 22, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
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

        {isAdmin && (
          <>
            <div style={{
              ...mono, fontSize: 9, color: LRH.gold,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              padding: '22px 8px 8px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 5, height: 5, background: LRH.gold }} />
              Administration ligue
            </div>
            {ligueItems.map((it) => {
              const isActive = it.id === active;
              const slug = it.id.replace('ligue-', '');
              const href = slug === 'competitions' ? '/dashboard/competitions' : `/dashboard/ligue/${slug}`;
              const Icon = it.icon;
              return (
                <Link key={it.id} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 10px', borderRadius: 8,
                    background: isActive ? LRH.gold : 'transparent',
                    color: isActive ? LRH.navy : 'rgba(255,255,255,0.78)',
                    ...body, fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer', marginBottom: 2,
                  }}>
                    <div style={{
                      width: 22, height: 22, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isActive ? LRH.navy : LRH.gold,
                    }}>
                      <Icon size={16} />
                    </div>
                    <span style={{ flex: 1 }}>{it.label}</span>
                  </div>
                </Link>
              );
            })}
          </>
        )}
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

function DashHeader({ title, userName }: { title: string, userName?: string | null }) {
  return (
    <div style={{
      padding: '16px 32px', borderBottom: '1px solid ' + LRH.hair,
      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <h1 style={{ ...display, fontWeight: 700, fontSize: 20, color: LRH.navy, margin: 0 }}>{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ ...body, fontSize: 13, color: LRH.mute, fontWeight: 600 }}>
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

export function HomeDashboardDesktop({ club, news, metrics, user, activeTab = 'actus', isAdmin = false, children }: any) {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: LRH.paper }}>
      <DashSidebar active={activeTab} club={club} isAdmin={isAdmin} counts={{ news: metrics.newsCount, members: metrics.membersCount }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <DashHeader
          title={
            activeTab === 'actus' ? "Actualités du Club"
            : activeTab === 'matches' ? "Calendrier & Matchs"
            : activeTab === 'standings' ? "Classements"
            : activeTab === 'ligue-competitions' ? "Ligue — Compétitions"
            : activeTab === 'ligue-bureau' ? "Ligue — Bureau exécutif"
            : activeTab === 'ligue-commissions' ? "Ligue — Commissions"
            : "Tableau de bord"
          }
          userName={user?.name}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children || (
            <div style={{ padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                <div>
                  <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Communication
                  </div>
                  <h2 style={{ ...display, fontWeight: 700, fontSize: 32, color: LRH.navy, margin: 0 }}>Gérer vos actualités.</h2>
                </div>
                <Link href="/dashboard/news/new">
                  <CTAButton variant="red">Nouvel article</CTAButton>
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
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
                  <div style={{ gridColumn: 'span 3', padding: 40, textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px dashed ' + LRH.hair }}>
                    <div style={{ ...display, fontSize: 16, color: LRH.mute }}>Aucune actualité pour le moment.</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
