# Project Instructions - siteweb

## Design System (LRH)
- **Composants** : Tous les composants d'interface liés à l'identité LRH doivent être importés depuis `components/lrh/tokens.tsx`.
- **Thème** : Les couleurs (Navy, Red, Gold) et les design tokens sont définis dans `tokens.tsx`.
- **Polices** : Utiliser les variables CSS pour les polices :
    - Titres : `var(--font-poppins)`
    - Corps : `var(--font-montserrat)`
    - Monospace : `var(--font-jetbrains-mono)`
- **Responsivité** : Utiliser la logique de switch `isMobile` définie dans `LrhSite.tsx` ou les media queries standards pour les nouvelles pages.
