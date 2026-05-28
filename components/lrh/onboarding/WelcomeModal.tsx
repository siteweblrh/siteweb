'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { LRH, body, display, mono } from '../tokens';
import { markOnboardingComplete } from '@/lib/actions/user';

type OnboardingStep = {
  kicker: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
};

const ADMIN_STEPS: OnboardingStep[] = [
  {
    kicker: '01 · Bienvenue',
    title: 'Console ligue.',
    body: "Tu es l'administrateur LRH. Tu pilotes les compétitions, les matchs, les classements, les comptes clubs, les documents officiels et la communication du site.",
  },
  {
    kicker: '02 · Compétitions & calendrier',
    title: 'Crée la saison.',
    body: "Dans « Compétitions » crée tes championnats et coupes. Dans « Calendrier », planifie les dates de la saison en mode Brouillon puis convertis les journées en matchs officiels (tirage au sort + équipes inscrites).",
    cta: { label: '▸ Aller au calendrier', href: '/dashboard/matches/calendar?mode=brouillon' },
  },
  {
    kicker: '03 · Comptes managers',
    title: 'Invite les clubs.',
    body: "Dans « Comptes », crée un compte par club et envoie l'invitation par email. Le manager reçoit son mot de passe provisoire et devra le changer à la première connexion.",
    cta: { label: '▸ Gérer les comptes', href: '/dashboard/ligue/users' },
  },
  {
    kicker: '04 · Documents & contenu',
    title: 'Diffuse les règlements.',
    body: "Dans « Documents », publie les règlements de compétition et formulaires officiels — les clubs y accèdent depuis leur dashboard. Dans « Contenu du site », édite les textes du site public sans toucher au code.",
    cta: { label: '▸ Voir les documents', href: '/dashboard/ligue/documents' },
  },
  {
    kicker: '05 · À retenir',
    title: "C'est parti.",
    body: "Toutes les actions destructives sont tracées dans « Journal d'audit ». Les classements sont recalculés automatiquement quand un match passe à terminé. En cas de doute : contact@lrh.re.",
  },
];

const CLUB_STEPS: OnboardingStep[] = [
  {
    kicker: '01 · Bienvenue',
    title: 'Dashboard de ton club.',
    body: "Tu peux gérer ton effectif, consulter ton calendrier, publier des actualités, renseigner tes terrains et créneaux d'entraînement, et télécharger les documents officiels diffusés par la ligue.",
  },
  {
    kicker: '02 · Effectif',
    title: 'Ajoute tes joueurs.',
    body: "Dans « Effectif », ajoute les joueurs et le staff de ton club avec leur poste, numéro de maillot, photo. Les statistiques de buts marqués et matchs joués se calculent automatiquement depuis les feuilles de match saisies par la ligue.",
    cta: { label: '▸ Aller à l\'effectif', href: '/dashboard/team' },
  },
  {
    kicker: '03 · Matchs & classements',
    title: 'Suis ta saison.',
    body: "Dans « Mes matchs », consulte le calendrier de ton équipe et laisse une note à la ligue si besoin (désaccord sur un score, contexte particulier). Dans « Classements », vois ta position en temps réel.",
    cta: { label: '▸ Voir mes matchs', href: '/dashboard/matches' },
  },
  {
    kicker: '04 · Profil & terrains',
    title: 'Renseigne le profil public.',
    body: "Dans « Profil du club », ajoute logo, couleurs, contacts, sponsors. Dans « Mes terrains », sélectionne les terrains de match et d'entraînement — tu peux en ajouter de nouveaux directement, ils apparaîtront aussi dans l'annuaire ligue.",
    cta: { label: '▸ Mes terrains', href: '/dashboard/venues' },
  },
  {
    kicker: '05 · Communication',
    title: 'Publie tes actualités.',
    body: "Dans « Actualités », rédige les communiqués et résultats du club — ils sont publiés sur le site après validation par la ligue. Les documents officiels (règlements, formulaires) sont dans « Documents ligue ».",
    cta: { label: '▸ Publier une actualité', href: '/dashboard/news/new' },
  },
];

export function WelcomeModal({ isAdmin }: { isAdmin: boolean }) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const steps = isAdmin ? ADMIN_STEPS : CLUB_STEPS;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  // Lock body scroll pendant l'affichage du modal.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const finish = () => {
    setClosing(true);
    startTransition(async () => {
      try {
        await markOnboardingComplete();
      } catch {
        // Si la mutation échoue, on ferme quand même côté client pour ne
        // pas bloquer l'utilisateur. Le modal réapparaîtra au prochain
        // chargement — pas dramatique.
      }
    });
  };

  if (closing) return null;

  return (
    <div
      onClick={isLast ? finish : undefined}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 17, 34, 0.72)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 540,
          width: '100%',
          background: '#fff',
          border: `4px solid ${LRH.gold}`,
          borderTop: `4px solid ${LRH.red}`,
          padding: '32px 30px 28px',
          position: 'relative',
        }}
      >
        {/* Stripe pattern décoratif */}
        <div
          style={{
            position: 'absolute', top: 0, right: 0, width: 120, height: 60,
            backgroundImage: 'repeating-linear-gradient(112deg, rgba(243,188,28,0.10) 0 2px, transparent 2px 16px)',
            pointerEvents: 'none',
          }}
        />

        {/* Skip button */}
        <button
          onClick={finish}
          disabled={isPending}
          aria-label="Passer le tutoriel"
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'transparent', border: 'none',
            ...mono, fontSize: 10, fontWeight: 700,
            color: LRH.mute, letterSpacing: '0.14em',
            textTransform: 'uppercase', cursor: 'pointer',
            padding: 6,
          }}
        >
          Passer ✕
        </button>

        <div style={{ position: 'relative' }}>
          <div style={{
            ...mono, fontSize: 10.5, fontWeight: 700,
            color: LRH.red, letterSpacing: '0.20em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            {current.kicker}
          </div>
          <h2
            id="onboarding-title"
            style={{
              ...display, fontWeight: 800,
              fontSize: 28, color: LRH.navy,
              letterSpacing: '-0.025em', margin: 0,
              lineHeight: 1.1,
            }}
          >
            {current.title}
          </h2>
          <p
            style={{
              ...body, fontSize: 14, color: LRH.ink2,
              margin: '16px 0 0', lineHeight: 1.6,
            }}
          >
            {current.body}
          </p>

          {current.cta && (
            <a
              href={current.cta.href}
              onClick={finish}
              style={{
                display: 'inline-block',
                marginTop: 18,
                ...mono, fontSize: 11, fontWeight: 700,
                padding: '10px 16px',
                background: LRH.navy, color: '#fff',
                border: 'none', textDecoration: 'none',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}
            >
              {current.cta.label}
            </a>
          )}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', margin: '28px 0 20px' }}>
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Étape ${i + 1}`}
              style={{
                width: i === step ? 22 : 8,
                height: 4,
                background: i === step ? LRH.navy : i < step ? LRH.gold : LRH.hairStrong,
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || isPending}
            style={{
              ...mono, fontSize: 11, fontWeight: 700,
              padding: '11px 18px',
              background: 'transparent', color: LRH.mute,
              border: '1px solid ' + LRH.hairStrong,
              cursor: step === 0 ? 'not-allowed' : 'pointer',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              opacity: step === 0 ? 0.5 : 1,
            }}
          >
            ← Précédent
          </button>

          {isLast ? (
            <button
              onClick={finish}
              disabled={isPending}
              style={{
                ...mono, fontSize: 11, fontWeight: 700,
                padding: '11px 22px',
                background: LRH.navy, color: '#fff',
                border: 'none', cursor: 'pointer',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}
            >
              {isPending ? '…' : '✓ C\'est parti'}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              style={{
                ...mono, fontSize: 11, fontWeight: 700,
                padding: '11px 18px',
                background: LRH.navy, color: '#fff',
                border: 'none', cursor: 'pointer',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}
            >
              Suivant →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
