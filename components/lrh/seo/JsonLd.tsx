/**
 * Insère un bloc `<script type="application/ld+json">` à partir d'un objet
 * sérialisable. Utiliser conjointement avec les builders de `lib/seo/jsonLd.ts`.
 *
 * Notes :
 * - `dangerouslySetInnerHTML` est nécessaire car JSON.stringify produit du
 *   texte, pas du JSX. Le contenu vient toujours d'un builder typé, donc
 *   pas de risque XSS dès lors qu'on ne lui passe pas de données utilisateur
 *   non échappées (les builders gèrent l'échappement des chaînes).
 * - `key` permet à Next 16 de dédupliquer si deux composants émettent le
 *   même bloc (ex: BreadcrumbList générique inclus 2x).
 */
export function JsonLd({ data, id }: { data: unknown; id?: string }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: builder-only
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      {...(id ? { id } : {})}
    />
  );
}
