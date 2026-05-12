// Club Dashboard — Desktop (1440 wide)

function DashSidebar({ active = 'actus' }) {
  const items = [
    { id: 'overview', label: 'Tableau de bord', kbd: 'D' },
    { id: 'actus',    label: 'Actualités',      kbd: 'A', count: 3 },
    { id: 'matches',  label: 'Matchs &amp; feuilles', kbd: 'M' },
    { id: 'licen',    label: 'Licenciés',       kbd: 'L', count: 87 },
    { id: 'team',     label: 'Effectif',        kbd: 'E' },
    { id: 'docs',     label: 'Documents',       kbd: 'O' },
    { id: 'sponsors', label: 'Partenaires',     kbd: 'P' },
    { id: 'billing',  label: 'Trésorerie',      kbd: 'T' },
  ];
  return (
    <div style={{
      width: 252, background: LRH.navy, color: '#fff',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ padding: '22px 22px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={(window.__resources && window.__resources.iconeLrh) || 'assets/icone-lrh.svg'} alt="" style={{ height: 32, width: 'auto' }} />
          <div style={{ ...display, lineHeight: 1.05 }}>
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.01em' }}>Portail Clubs</div>
            <div style={{ ...mono, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginTop: 3 }}>LRH · v 2.4</div>
          </div>
        </div>
        <div style={{
          marginTop: 18, padding: 12, borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <ClubCrest id="USPG" size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...display, fontWeight: 700, fontSize: 13 }}>USPG Le Port</div>
            <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', marginTop: 2 }}>ID · 974-USPG-1984</div>
          </div>
          <span style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>⌄</span>
        </div>
      </div>

      <div style={{ padding: '18px 14px', flex: 1, overflowY: 'auto' }}>
        <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '0 8px 8px' }}>
          Gestion du club
        </div>
        {items.map((it) => {
          const isActive = it.id === active;
          return (
            <div key={it.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 10px', borderRadius: 8,
              background: isActive ? LRH.red : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.78)',
              ...body, fontSize: 12.5, fontWeight: isActive ? 700 : 500,
              cursor: 'pointer', marginBottom: 2,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                flexShrink: 0,
              }} />
              <span dangerouslySetInnerHTML={{ __html: it.label }} style={{ flex: 1 }} />
              {it.count != null && (
                <span style={{
                  ...mono, fontSize: 9, letterSpacing: '0.04em',
                  background: isActive ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.08)',
                  padding: '2px 7px', borderRadius: 999, fontWeight: 700,
                }}>{it.count}</span>
              )}
              <span style={{ ...mono, fontSize: 9, color: isActive ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>⌥{it.kbd}</span>
            </div>
          );
        })}

        <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.16em', textTransform: 'uppercase', padding: '24px 8px 8px' }}>
          Compétitions
        </div>
        {['Calendrier officiel', 'Classements', 'Coupe de la Réunion'].map((l) => (
          <div key={l} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '9px 10px', borderRadius: 8,
            color: 'rgba(255,255,255,0.78)',
            ...body, fontSize: 12.5, fontWeight: 500,
            cursor: 'pointer', marginBottom: 2,
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
            {l}
          </div>
        ))}
      </div>

      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          padding: 12, borderRadius: 10,
          background: 'linear-gradient(135deg, ' + LRH.gold + ' 0%, #E0A810 100%)',
          color: LRH.navy,
        }}>
          <div style={{ ...mono, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>★ Pro</div>
          <div style={{ ...display, fontWeight: 700, fontSize: 12.5, marginTop: 4, lineHeight: 1.25 }}>
            Activez les statistiques avancées
          </div>
          <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, marginTop: 8, letterSpacing: '0.06em' }}>EN SAVOIR PLUS →</div>
        </div>
        <div style={{
          marginTop: 14, display: 'flex', alignItems: 'center', gap: 10,
          padding: '4px 4px',
        }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: LRH.gold, color: LRH.navy, ...display, fontWeight: 800, fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>NH</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...body, fontSize: 12, fontWeight: 600 }}>Nathan Hoarau</div>
            <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.06em' }}>Président</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashTopbar() {
  return (
    <div style={{
      padding: '14px 28px', borderBottom: '1px solid ' + LRH.hair,
      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...body, fontSize: 12.5, color: LRH.mute }}>
        <span>USPG Le Port</span>
        <span style={{ ...mono, fontSize: 10, opacity: 0.6 }}>/</span>
        <span>Communication</span>
        <span style={{ ...mono, fontSize: 10, opacity: 0.6 }}>/</span>
        <span style={{ color: LRH.navy, fontWeight: 700 }}>Publier une actualité</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          padding: '8px 14px', borderRadius: 8, background: LRH.paperWarm,
          ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#fff' }} />
          Rechercher partout
          <span style={{ ...mono, fontSize: 9, padding: '2px 6px', background: '#fff', borderRadius: 3, color: LRH.mute, letterSpacing: '0.04em' }}>⌘K</span>
        </div>
        <div style={{ width: 1, height: 24, background: LRH.hair }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: LRH.paperWarm, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, background: LRH.red, borderRadius: '50%' }} />
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: LRH.paperWarm }} />
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid ' + LRH.hair }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ ...mono, fontSize: 11, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
            ● Communication du club
          </div>
          <h1 style={{ ...display, fontWeight: 700, fontSize: 36, color: LRH.navy, margin: 0, letterSpacing: '-0.025em', lineHeight: 1 }}>
            Publier une actualité
          </h1>
          <p style={{ ...body, fontSize: 13.5, color: LRH.mute, margin: '10px 0 0', maxWidth: 540, lineHeight: 1.55 }}>
            Votre publication apparaîtra sur lrh.re, dans l'app mobile et sur la page club. La modération LRH valide sous 24h.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            ...body, fontWeight: 700, fontSize: 12.5, color: LRH.navy,
            background: '#fff', border: '1px solid ' + LRH.hairStrong,
            borderRadius: 8, padding: '10px 16px',
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
          }}>Brouillon</button>
          <button style={{
            ...body, fontWeight: 700, fontSize: 12.5, color: '#fff',
            background: LRH.navy, border: 'none',
            borderRadius: 8, padding: '10px 18px',
            letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 10,
          }}>Soumettre pour validation <span style={{ ...mono, fontSize: 11 }}>→</span></button>
        </div>
      </div>
    </div>
  );
}

function StatsRow() {
  const stats = [
    { l: 'Licenciés actifs', v: '87', delta: '+ 4 ce mois', sub: 'objectif 100', trend: 'up' },
    { l: 'Matchs joués',     v: '13', delta: 'sur 18',      sub: '72% saison',  trend: 'flat' },
    { l: 'Victoires',        v: '8',  delta: '61,5 %',      sub: '6e attaque',  trend: 'up' },
    { l: 'Buts marqués',     v: '34', delta: 'Δ +12',       sub: 'meilleur du peï', trend: 'up' },
  ];
  return (
    <div style={{
      padding: '24px 40px',
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
      borderBottom: '1px solid ' + LRH.hair,
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          padding: 18, borderRadius: 12,
          background: '#fff', border: '1px solid ' + LRH.hair,
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
              {s.l}
            </div>
            <div style={{
              width: 24, height: 12, borderRadius: 6,
              background: s.trend === 'up' ? 'rgba(31, 138, 91, 0.12)' : LRH.paperWarm,
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
            <div style={{ ...display, fontWeight: 800, fontSize: 38, letterSpacing: '-0.035em', color: LRH.navy, lineHeight: 1 }}>{s.v}</div>
            <div style={{ ...mono, fontSize: 10, color: s.trend === 'up' ? '#1F8A5B' : LRH.mute, fontWeight: 700, letterSpacing: '0.04em' }}>{s.delta}</div>
          </div>
          <div style={{ ...body, fontSize: 11.5, color: LRH.mute, marginTop: 6 }}>{s.sub}</div>
          {/* sparkline */}
          <svg style={{ position: 'absolute', right: 18, bottom: 12 }} width="64" height="22" viewBox="0 0 64 22">
            <polyline
              points={i === 0 ? '0,18 12,14 22,15 30,9 40,11 52,5 64,3' :
                      i === 1 ? '0,12 12,10 22,12 30,11 40,13 52,12 64,12' :
                      i === 2 ? '0,16 12,12 22,14 30,8 40,9 52,5 64,4' :
                                '0,20 12,15 22,12 30,14 40,8 52,5 64,2'}
              fill="none" stroke={s.trend === 'up' ? '#1F8A5B' : LRH.mute} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
              opacity={s.trend === 'up' ? 0.85 : 0.4}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

function ComposeForm() {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid ' + LRH.hair,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid ' + LRH.hair, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Brève', 'Article', 'Reportage', 'Communiqué'].map((t, i) => (
            <div key={t} style={{
              padding: '7px 13px', borderRadius: 6,
              background: i === 1 ? LRH.navy : 'transparent',
              color: i === 1 ? '#fff' : LRH.ink2,
              ...body, fontSize: 11.5, fontWeight: 700,
              letterSpacing: '0.04em', cursor: 'pointer',
            }}>{t}</div>
          ))}
        </div>
        <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.06em' }}>
          Auto-sauvegardé · il y a 12 s
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>
        <FormLabel>Titre de l'article</FormLabel>
        <div style={{
          ...display, fontWeight: 700, fontSize: 30, color: LRH.navy,
          letterSpacing: '-0.025em', lineHeight: 1.15,
          padding: '8px 0', borderBottom: '2px solid ' + LRH.navy,
          marginTop: 8,
        }}>
          USPG Le Port s'impose 4-3 face à Saint-Denis<span style={{ background: LRH.navy, width: 2, display: 'inline-block', height: 28, marginLeft: 2, verticalAlign: 'middle' }} />
        </div>
        <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.04em', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span>Idéal : 50–80 caractères · Actuel : 49</span>
          <span style={{ color: '#1F8A5B' }}>● Bon score SEO</span>
        </div>

        <div style={{ marginTop: 26 }}>
          <FormLabel>Chapô <span style={{ ...mono, fontSize: 9, color: LRH.mute, fontWeight: 600, letterSpacing: '0.06em' }}>· 1–2 phrases</span></FormLabel>
          <div style={{
            ...body, fontSize: 14, color: LRH.ink, lineHeight: 1.55,
            padding: '12px 14px', borderRadius: 8,
            border: '1px solid ' + LRH.hairStrong,
            marginTop: 8, minHeight: 70,
          }}>
            Match Choc de la J14 — USPG Le Port renverse Saint-Denis sur le fil grâce à un doublé de Loïc Payet dans le dernier quart-temps. Récit.
          </div>
        </div>

        <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
          <div>
            <FormLabel>Image de couverture</FormLabel>
            <div style={{
              marginTop: 8, height: 200, borderRadius: 10,
              border: '1.5px dashed ' + LRH.hairStrong,
              background: LRH.paperWarm, position: 'relative', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...display, fontWeight: 800, fontSize: 22, color: LRH.navy,
              }}>↑</div>
              <div style={{ ...body, fontSize: 13, fontWeight: 600, color: LRH.navy }}>Glisser une image ici</div>
              <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.06em' }}>
                JPG / PNG · 1920×1080 · max 5 MB
              </div>
            </div>
          </div>
          <div>
            <FormLabel>Réglages de publication</FormLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <SettingRow label="Catégorie" value="Match — D1 Gazon" />
              <SettingRow label="Saison" value="2025–2026" />
              <SettingRow label="Visibilité" value="Public" badge="● ouvert" />
              <SettingRow label="Publication" value="Auto · après validation" />
              <SettingRow label="Sponsor associé" value="Run Market" badge="natif" />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 26 }}>
          <FormLabel>Joueurs cités <span style={{ ...mono, fontSize: 9, color: LRH.mute, fontWeight: 600, letterSpacing: '0.06em' }}>· @-mentionnés pour stats</span></FormLabel>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              ['LP', 'Loïc Payet', LRH.red, '#11'],
              ['TG', 'Thierry Grondin', LRH.navy, '#7'],
              ['JK', 'Jonas K.', LRH.gold, '#3', LRH.navy],
              ['+', 'Ajouter', LRH.hair, null],
            ].map((p, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '5px 11px 5px 5px', borderRadius: 999,
                background: i === 3 ? 'transparent' : LRH.paperWarm,
                border: i === 3 ? '1px dashed ' + LRH.hairStrong : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: i === 3 ? 'transparent' : p[2],
                  color: i === 3 ? LRH.mute : (p[4] || '#fff'),
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  ...display, fontWeight: 800, fontSize: 10,
                }}>{p[0]}</div>
                <span style={{ ...body, fontSize: 12, fontWeight: 600, color: i === 3 ? LRH.mute : LRH.navy }}>{p[1]}</span>
                {p[3] && <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.04em' }}>{p[3]}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        padding: '14px 24px', borderTop: '1px solid ' + LRH.hair, background: LRH.paper,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...body, fontSize: 12, color: LRH.mute }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, background: '#1F8A5B', borderRadius: '50%' }} />
            Conforme à la charte LRH
          </span>
          <span style={{ ...mono, fontSize: 10, letterSpacing: '0.06em' }}>349 mots · 1 min 40 lecture</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={btnGhost}>Aperçu</button>
          <button style={btnPrimary}>Soumettre <span style={{ ...mono, fontSize: 11 }}>↵</span></button>
        </div>
      </div>
    </div>
  );
}

const btnGhost = {
  ...body, fontWeight: 700, fontSize: 12.5, color: LRH.navy,
  background: '#fff', border: '1px solid ' + LRH.hairStrong,
  borderRadius: 8, padding: '10px 16px',
  letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
};
const btnPrimary = {
  ...body, fontWeight: 700, fontSize: 12.5, color: '#fff',
  background: LRH.navy, border: 'none',
  borderRadius: 8, padding: '10px 18px',
  letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 10,
};

function FormLabel({ children }) {
  return (
    <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
      {children}
    </div>
  );
}

function SettingRow({ label, value, badge }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 8, background: LRH.paperWarm,
    }}>
      <span style={{ ...body, fontSize: 12, color: LRH.mute, fontWeight: 500 }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...body, fontSize: 12.5, color: LRH.navy, fontWeight: 700 }}>{value}</span>
        {badge && <span style={{ ...mono, fontSize: 9, color: '#1F8A5B', letterSpacing: '0.06em', padding: '2px 6px', background: 'rgba(31,138,91,0.1)', borderRadius: 3 }}>{badge}</span>}
        <span style={{ ...mono, fontSize: 10, color: LRH.mute }}>⌄</span>
      </span>
    </div>
  );
}

function RecentSidebar() {
  const recent = [
    { state: 'En ligne',   stateColor: '#1F8A5B', t: 'USPG renforce son staff avec Lila T.', when: 'Il y a 2 j', views: '1 240' },
    { state: 'Validation', stateColor: LRH.gold,  t: 'Tournoi U12 : un week-end record',         when: 'Il y a 4 j', views: '—' },
    { state: 'Brouillon',  stateColor: LRH.mute,  t: 'Stage de pré-saison à Saint-Leu',          when: 'Il y a 6 j', views: '—' },
    { state: 'En ligne',   stateColor: '#1F8A5B', t: 'Loïc Payet, 9 buts en 13 matchs',          when: 'Il y a 9 j', views: '2 870' },
  ];
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid ' + LRH.hair,
      padding: 22,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ ...display, fontWeight: 700, fontSize: 16, color: LRH.navy, letterSpacing: '-0.01em' }}>
          Vos publications récentes
        </div>
        <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.06em' }}>4 / 12</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {recent.map((r, i) => (
          <div key={i} style={{
            padding: '14px 0', borderTop: i === 0 ? 'none' : '1px solid ' + LRH.hair,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.stateColor, marginTop: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...mono, fontSize: 9, color: r.stateColor, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
                {r.state}
              </div>
              <div style={{ ...body, fontSize: 13, fontWeight: 600, color: LRH.navy, marginTop: 4, lineHeight: 1.3 }}>
                {r.t}
              </div>
              <div style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.06em', marginTop: 6, display: 'flex', gap: 12 }}>
                <span>{r.when}</span>
                <span>👁 {r.views}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid ' + LRH.hair, ...body, fontSize: 12.5, fontWeight: 700, color: LRH.navy, display: 'flex', justifyContent: 'space-between' }}>
        <span>Toutes les publications</span>
        <span style={{ ...mono, fontSize: 12 }}>→</span>
      </div>
    </div>
  );
}

function NextMatchSidebar() {
  return (
    <div style={{
      background: LRH.navy, color: '#fff', borderRadius: 16, padding: 22,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', right: -40, top: -40, width: 180, height: 180,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(243,188,28,0.25) 0%, transparent 70%)',
      }} />
      <div style={{ ...mono, fontSize: 10, color: LRH.gold, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, position: 'relative' }}>
        Prochain match · J14
      </div>
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ClubCrest id="USPG" size={48} />
          <div style={{ ...display, fontWeight: 700, fontSize: 12 }}>USPG Le Port</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...display, fontWeight: 800, fontSize: 26, color: LRH.gold, letterSpacing: '-0.03em', lineHeight: 1 }}>SAM 21</div>
          <div style={{ ...mono, fontSize: 11, marginTop: 4, letterSpacing: '0.06em', opacity: 0.7 }}>15:00 LT</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <ClubCrest id="SDHC" size={48} />
          <div style={{ ...display, fontWeight: 700, fontSize: 12 }}>Saint-Denis</div>
        </div>
      </div>
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.1)', ...body, fontSize: 11.5, color: 'rgba(255,255,255,0.7)' }}>
        Stade Manès · Le Port — billetterie ouverte
      </div>
      <button style={{
        marginTop: 14, width: '100%', ...body, fontWeight: 700, fontSize: 12, color: LRH.navy,
        background: LRH.gold, border: 'none', borderRadius: 8, padding: '11px 0',
        letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
      }}>Préparer la feuille de match</button>
    </div>
  );
}

function ChecklistSidebar() {
  const items = [
    { d: true,  l: 'Licence renouvelée pour 87/87 joueurs' },
    { d: true,  l: 'Affilliation 2025–2026 validée' },
    { d: false, l: '3 feuilles de match à finaliser' },
    { d: false, l: 'Mettre à jour les coachs U15' },
    { d: false, l: 'Souscrire l\'assurance Salle 2026' },
  ];
  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid ' + LRH.hair,
      padding: 22,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ ...display, fontWeight: 700, fontSize: 16, color: LRH.navy, letterSpacing: '-0.01em' }}>
          À faire pour la saison
        </div>
        <span style={{ ...mono, fontSize: 10, color: '#1F8A5B', letterSpacing: '0.06em', fontWeight: 700 }}>2/5</span>
      </div>
      <div style={{ height: 6, background: LRH.paperWarm, borderRadius: 3, marginTop: 14, overflow: 'hidden' }}>
        <div style={{ width: '40%', height: '100%', background: 'linear-gradient(90deg, ' + LRH.gold + ', ' + LRH.red + ')' }} />
      </div>
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((i, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4, marginTop: 1,
              background: i.d ? LRH.navy : '#fff',
              border: '1.5px solid ' + (i.d ? LRH.navy : LRH.hairStrong),
              flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10, fontWeight: 800,
            }}>{i.d && '✓'}</div>
            <div style={{ ...body, fontSize: 12.5, color: i.d ? LRH.mute : LRH.ink2, textDecoration: i.d ? 'line-through' : 'none', lineHeight: 1.4 }}>
              {i.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardDesktop() {
  return (
    <div style={{
      display: 'flex', background: LRH.paper, ...body, color: LRH.ink, minHeight: '100%',
    }}>
      <DashSidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <DashTopbar />
        <PageHeader />
        <StatsRow />
        <div style={{ padding: '24px 40px 40px', display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 20 }}>
          <ComposeForm />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <NextMatchSidebar />
            <RecentSidebar />
            <ChecklistSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardDesktop });
