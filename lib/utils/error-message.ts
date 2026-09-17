/**
 * Message d'erreur affichable, extrait d'un `catch`.
 *
 * TypeScript strict ne laisse pas lire `.message` sur la variable d'un `catch`
 * sans vérifier ce qu'elle contient. L'annotation `: any` contournait ça au
 * prix d'un trou de typage, et elle était répétée une cinquantaine de fois
 * dans les écrans d'admin.
 *
 * Le comportement reproduit exactement celui de l'ancien `e?.message || fallback` :
 * une `Error` au message vide retombe sur le fallback, et tout ce qui n'est pas
 * une `Error` (string levée, rejet non-Error d'une lib tierce) aussi.
 *
 * Fichier volontairement neutre — aucun import serveur — pour être utilisable
 * depuis un composant `'use client'`.
 */
export function errorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Teste le code d'erreur d'une exception Prisma (`P2002` = violation d'unique,
 * etc.).
 *
 * On lit la propriété `code` au lieu d'un `instanceof
 * PrismaClientKnownRequestError` volontairement : l'`instanceof` dépend de
 * l'identité de la classe, qui peut différer entre le client généré et un
 * bundle serveur, et il rendrait `false` sur une erreur pourtant bien réelle.
 * Le test par propriété reproduit exactement ce que faisait `e?.code === '…'`.
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}
