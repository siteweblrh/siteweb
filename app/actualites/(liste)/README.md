Ce groupe de routes n'existe que pour **borner la frontiere de streaming**.

`loading.tsx` s'applique a tout le sous-arbre de son segment. Place a
`app/actualites/loading.tsx`, il enveloppait aussi `[slug]` dans un Suspense :
la reponse d'une page d'article partait donc en streaming, les en-tetes etaient
envoyes avant que `notFound()` ne soit connu, et une URL d'article inexistante
repondait **200 au lieu de 404** (comportement documente de Next, cf.
`docs/01-app/03-api-reference/03-file-conventions/loading.md`, section
« Status Codes »).

Le groupe `(liste)` ne change aucune URL : la page sert toujours `/actualites`.
Il limite simplement le squelette de chargement a la liste, et laisse
`[slug]` rendre sans frontiere Suspense — donc avec un vrai code HTTP.

Ne pas remonter `loading.tsx` d'un cran sans refaire ce raisonnement.
