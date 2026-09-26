/**
 * Affichage du nom d'un licencié — source unique.
 *
 * Pourquoi un helper : `Member.lastName` est une colonne NON nullable, mais
 * elle peut légitimement être VIDE. Les feuilles des rassemblements jeunes ne
 * portent que le prénom ("Esma", "Robin"), et la ligue ne dispose pas des noms
 * de famille des mineurs au moment de la saisie. Écrire une chaîne vide est le
 * choix honnête (cf. la règle « une information manquante s'affiche comme
 * manquante ») — à condition que les vues ne concatènent pas à l'aveugle.
 *
 * Sans ça, `${firstName[0]}. ${lastName}` rendait « E. » dans le strip de la
 * home : un libellé qui passe pour un bug du site. Ces trois fonctions sont les
 * seules autorisées à composer un nom affiché.
 *
 * Fichier volontairement neutre (aucun import Prisma) : il est consommé par des
 * composants `'use client'` — cf. feedback_client_safe_imports.
 */

type NamedMember = { firstName: string; lastName: string };

/** Nom complet : « Jean Dupont », ou « Esma » quand le nom de famille manque. */
export function memberFullName(m: NamedMember): string {
  return `${m.firstName} ${m.lastName}`.trim();
}

/**
 * Forme courte des espaces contraints (strip de la home, pills) :
 * « J. Dupont », ou le prénom seul quand le nom de famille manque —
 * jamais « E. », qui ressemble à une donnée tronquée.
 */
export function memberShortName(m: NamedMember): string {
  const last = m.lastName.trim();
  const first = m.firstName.trim();
  if (!last) return first;
  if (!first) return last;
  return `${first[0]}. ${last}`;
}

/** Initiales pour les avatars de repli : « JD », ou « E » à défaut. */
export function memberInitials(m: NamedMember): string {
  return `${m.firstName.trim()[0] ?? ''}${m.lastName.trim()[0] ?? ''}`.toUpperCase();
}
