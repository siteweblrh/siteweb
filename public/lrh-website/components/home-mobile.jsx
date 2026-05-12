// Home — Mobile (390 × ~2400)

function MobileHeader({ mode, setMode }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid ' + LRH.hair, position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{
        background: LRH.navy, color: 'rgba(255,255,255,0.7)',
        padding: '5px 16px', ...mono, fontSize: 9, letterSpacing: '0.1em',
        textTransform: 'uppercase', textAlign: 'center',
      }}>
        ● Saint-Denis · 27°C — J–04 Coupe de la Réunion
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
        <LrhLockup height={32} />
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: LRH.paperWarm,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...mono, fontWeight: 800, fontSize: 14, color: LRH.navy,
        }}>≡</div>
      </div>
      <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex', padding: 4, borderRadius: 999, background: LRH.navy, width: '100%',
        }}>
          {['gazon', 'salle'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, ...body, fontWeight: 700, fontSize: 12,
              color: mode === m ? LRH.navy : 'rgba(255,255,255,0.65)',
              background: mode === m ? LRH.gold : 'transparent',
              border: 'none', borderRadius: 999, padding: '10px 0',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: mode === m ? LRH.navy : 'rgba(255,255,255,0.3)' }} />
              {m === 'gazon' ? 'Gazon' : 'Salle'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileHero({ mode }) {
  const headline = mode === 'gazon' ? 'LE HOCKEY\nPEÏ,\nNIVEAU\nSUPÉRIEUR.' : 'LA SALLE\nÉLECTRIQUE.';
  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div style={{
        position: 'relative', height: 540, borderRadius: 18, overflow: 'hidden',
        ...heroPlaceholderStyle({ tone: mode }),
      }}>
        <div style={{
          position: 'absolute', top: 14, left: 16, right: 16,
          display: 'flex', justifyContent: 'space-between',
          ...mono, fontSize: 8.5, color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          <span>[ HD · STADE MANÈS ]</span>
          <span style={{ color: LRH.gold }}>● LIVE</span>
        </div>
        <div style={{
          position: 'absolute', left: 16, top: 60, right: 16,
        }}>
          <div style={{
            ...mono, fontSize: 9, color: LRH.gold,
            letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10,
          }}>
            ● Saison {mode === 'gazon' ? "'25–'26" : 'Indoor 26'} — J14
          </div>
          <h1 style={{
            ...display, fontWeight: 800, fontSize: 52,
            lineHeight: 0.92, color: '#fff', margin: 0,
            letterSpacing: '-0.035em', whiteSpace: 'pre-line',
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}>{headline}</h1>
        </div>
        {/* Glass score */}
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
          <div style={{
            padding: 16, borderRadius: 16,
            background: 'rgba(15,25,45,0.5)',
            backdropFilter: 'blur(20px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#fff',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 9, letterSpacing: '0.16em', color: LRH.gold, textTransform: 'uppercase', marginBottom: 12 }}>
              <span>★ Match Choc · J14</span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>DIM 14:00</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClubCrest id="USPG" size={32} />
              <div style={{ flex: 1, ...display, fontWeight: 700, fontSize: 13 }}>USPG Le Port</div>
              <div style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em' }}>3</div>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ClubCrest id="SDHC" size={32} />
              <div style={{ flex: 1, ...display, fontWeight: 700, fontSize: 13 }}>Saint-Denis HC</div>
              <div style={{ ...display, fontWeight: 800, fontSize: 26, letterSpacing: '-0.03em', color: LRH.gold }}>4</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <CTAButton variant="red" size="lg">Prendre une licence</CTAButton>
        <button style={{
          ...body, fontWeight: 700, fontSize: 13, color: LRH.navy,
          background: '#fff', border: '1px solid ' + LRH.hairStrong,
          borderRadius: 8, padding: '14px 16px',
          letterSpacing: '0.06em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>Live</button>
      </div>
    </div>
  );
}

function MobileBento({ mode }) {
  return (
    <div style={{ padding: '36px 16px 0' }}>
      <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
        01 · La semaine
      </div>
      <h2 style={{ ...display, fontWeight: 700, fontSize: 30, color: LRH.navy, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
        Résultats &amp; classement.
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        {/* Last result */}
        <Card>
          <CardHeader kicker="Dernier résultat" meta="J13" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <ClubCrest id="HCO" size={40} />
            <div style={{ flex: 1, ...display, fontWeight: 700, fontSize: 14, color: LRH.navy }}>HC de l'Ouest</div>
            <div style={{ ...display, fontWeight: 800, fontSize: 30, color: LRH.navy, letterSpacing: '-0.03em' }}>2</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <ClubCrest id="HHS" size={40} />
            <div style={{ flex: 1, ...display, fontWeight: 700, fontSize: 14, color: LRH.navy }}>Hockey Horizon Sud</div>
            <div style={{ ...display, fontWeight: 800, fontSize: 30, color: LRH.red, letterSpacing: '-0.03em' }}>5</div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed ' + LRH.hairStrong, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Présenté par</span>
            <div style={{ padding: '3px 8px', borderRadius: 3, background: LRH.navy, color: LRH.gold, ...display, fontWeight: 800, fontSize: 10 }}>RUN&nbsp;MARKET</div>
          </div>
        </Card>

        {/* Top 3 */}
        <Card dark>
          <CardHeaderDark kicker="Top 3" meta={mode === 'gazon' ? 'D1 GAZON' : 'D1 SALLE'} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { r: 1, name: 'Saint-Denis HC',     id: 'SDHC', p: 28 },
              { r: 2, name: 'Hockey Horizon Sud', id: 'HHS',  p: 22 },
              { r: 3, name: "HC de l'Ouest",      id: 'HCO',  p: 20 },
            ].map((x) => (
              <div key={x.r} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ ...display, fontWeight: 800, fontSize: 20, color: x.r === 1 ? LRH.gold : '#fff', minWidth: 24 }}>0{x.r}</div>
                <ClubCrest id={x.id} size={30} />
                <div style={{ flex: 1, ...display, fontWeight: 600, fontSize: 13 }}>{x.name}</div>
                <div style={{ ...display, fontWeight: 700, fontSize: 16 }}>{x.p}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Player of month */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <ImageSlot label="Portrait — Loïc Payet" height={200} tone="navy" radius={0} />
            <div style={{ position: 'absolute', top: 12, left: 12, padding: '5px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ ...mono, fontSize: 8, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>présenté par</span>
              <span style={{ ...display, fontWeight: 800, fontSize: 10, color: LRH.navy }}>CRÉDIT&nbsp;PEÏ</span>
            </div>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ ...mono, fontSize: 9.5, color: LRH.red, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>Joueur du mois</div>
            <h3 style={{ ...display, fontWeight: 700, fontSize: 22, color: LRH.navy, margin: '6px 0 2px', letterSpacing: '-0.02em' }}>Loïc Payet</h3>
            <div style={{ ...body, fontSize: 12, color: LRH.mute }}>USPG Le Port · #11 · Milieu</div>
            <div style={{ display: 'flex', gap: 22, marginTop: 14, paddingTop: 12, borderTop: '1px solid ' + LRH.hair }}>
              <Stat n="9" l="Buts" />
              <Stat n="6" l="Passes" />
              <Stat n="2.4" l="xG" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MobileCompetitions({ mode }) {
  return (
    <div style={{ padding: '36px 0 0' }}>
      <div style={{ padding: '0 16px' }}>
        <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
          02 · Calendrier
        </div>
        <h2 style={{ ...display, fontWeight: 700, fontSize: 30, color: LRH.navy, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          Les prochaines journées.
        </h2>
      </div>
      <div style={{
        marginTop: 18, padding: '0 16px 4px', display: 'flex', gap: 8, overflowX: 'auto',
      }}>
        {['D1 ' + (mode === 'gazon' ? 'Gazon' : 'Salle'), 'D2', 'U18', 'Féminines', 'Coupe'].map((c, i) => (
          <div key={c} style={{
            padding: '7px 12px', borderRadius: 999, flexShrink: 0,
            background: i === 0 ? LRH.navy : '#fff', color: i === 0 ? '#fff' : LRH.ink2,
            border: i === 0 ? 'none' : '1px solid ' + LRH.hairStrong,
            ...body, fontSize: 11.5, fontWeight: 700,
          }}>{c}</div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { d: 'SAM 21 · 15:00', home: 'USPG', away: 'SDHC', venue: 'Stade Manès · Le Port' },
          { d: 'SAM 21 · 17:30', home: 'HHS',  away: 'HCO',  venue: 'Casabona · Le Tampon' },
          { d: 'DIM 22 · 10:00', home: 'HCP',  away: 'SDHC', venue: 'Stade du Ravine à Malheur · La Possession' },
        ].map((m, i) => (
          <Card key={i} style={{ padding: 16 }}>
            <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.12em', marginBottom: 10 }}>{m.d}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ClubCrest id={m.home} size={28} />
                <span style={{ ...display, fontSize: 13, fontWeight: 600, color: LRH.navy }}>{clubName(m.home)}</span>
              </div>
              <span style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.1em' }}>VS</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse' }}>
                <ClubCrest id={m.away} size={28} />
                <span style={{ ...display, fontSize: 13, fontWeight: 600, color: LRH.navy }}>{clubName(m.away)}</span>
              </div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + LRH.hair, ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              📍 {m.venue}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MobileNews() {
  const items = [
    { tag: 'Reportage', t: 'Au cœur de la 7<sup>ème</sup> nuit du hockey péï', tone: 'sun', mins: '03 min', big: true },
    { tag: 'Tactique',  t: 'Le pressing haut de Tampon, décrypté.',           tone: 'turf', mins: '06 min', sponsor: 'OUEST TV' },
    { tag: 'Formation', t: 'Académie U15 — inscriptions ouvertes',             tone: 'paper', mins: '04 min' },
  ];
  return (
    <div style={{ padding: '40px 16px 16px', background: LRH.paper }}>
      <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
        03 · Actualités
      </div>
      <h2 style={{ ...display, fontWeight: 700, fontSize: 30, color: LRH.navy, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
        Le terrain raconte<br/>plus que le score.
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        {items.map((it, i) => (
          <Card key={i} style={{ padding: 0, overflow: 'hidden' }}>
            <ImageSlot label={`Photo · ${it.tag}`} height={it.big ? 200 : 140} tone={it.tone} radius={0} />
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ padding: '3px 8px', borderRadius: 3, background: LRH.navy, color: '#fff', ...mono, fontSize: 8.5, letterSpacing: '0.14em', fontWeight: 700, textTransform: 'uppercase' }}>{it.tag}</div>
                <div style={{ ...mono, fontSize: 9, color: LRH.mute }}>● {it.mins}</div>
              </div>
              <h3 dangerouslySetInnerHTML={{ __html: it.t }} style={{ ...display, fontWeight: 700, fontSize: it.big ? 22 : 18, color: LRH.navy, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15 }} />
              {it.sponsor && (
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed ' + LRH.hairStrong, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Partenaire</span>
                  <span style={{ ...display, fontWeight: 800, fontSize: 11, color: LRH.navy }}>{it.sponsor}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MobileTabBar() {
  return (
    <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid ' + LRH.hair, padding: '10px 0 calc(10px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'space-around' }}>
      {[
        { l: 'Accueil', active: true },
        { l: 'Matchs' },
        { l: 'Clubs' },
        { l: 'Licence' },
        { l: 'Compte' },
      ].map((t) => (
        <div key={t.l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: t.active ? LRH.navy : LRH.hair }} />
          <div style={{ ...mono, fontSize: 8.5, fontWeight: 700, color: t.active ? LRH.navy : LRH.mute, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t.l}</div>
        </div>
      ))}
    </div>
  );
}

function HomeMobile({ mode, setMode }) {
  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100%' }}>
      <MobileHeader mode={mode} setMode={setMode} />
      <MobileHero mode={mode} />
      <MobileBento mode={mode} />
      <MobileCompetitions mode={mode} />
      <MobileNews />
      <MobileTabBar />
    </div>
  );
}

Object.assign(window, { HomeMobile });
