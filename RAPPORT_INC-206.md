# Rapport d'incident INC-206

Inscriptions et convocations bloquées le 19 novembre 2026 au matin.

Les heures ci-dessous sont celles du Bénin (UTC+1).

## Résumé

Pendant 30 minutes, le service national d'identité a mis plus de 5 secondes à répondre. L'application attendait cette réponse sans limite. Les pages d'inscription et de convocation tournaient sans fin. Soixante requêtes ont été retenues, jusqu'à 61,7 secondes. Dans cette attente, plusieurs enregistrements partis ensemble ont reçu le même numéro de table, et Lokossa est passé au-dessus de sa capacité.

## Chronologie

| Heure | Fait |
|---|---|
| 09:09:53 | Premier appel d'identité lent : 5 157 ms, réponse tout de même 200. Le journal le marque WARN. |
| 09:11 à 09:12 | Onze inscriptions aux impôts arrivent ensemble à Lokossa. Elles lisent le même compteur de places et les mêmes numéros `L-0297` et `L-0298`. |
| 09:21:39 et 09:21:47 | Deux candidats différents reçoivent `P-0464` à Parakou, concours des douanes. |
| 09:39:49 | Dernier appel lent de la série. |
| Après 09:39 | Les appels d'identité redescendent sous les 5 secondes. Les pages redeviennent utilisables. |

La fenêtre va de 09:09:53 à 09:39:49. Les autres pages, liste des concours et liste des centres, ne sont pas touchées : elles n'appellent pas l'identité.

## Cause racine

Avant d'enregistrer une inscription, le programme demande au service d'identité si le NPI existe. Pour afficher une convocation, il rappelle ce service pour obtenir le nom. L'appel utilise un client HTTP ordinaire, sans durée maximale. Le programme attend la réponse, même au-delà d'une minute.

La règle prévue était l'inverse. Si l'identité ne répond pas dans les 5 secondes, l'inscription doit être enregistrée avec le statut « en attente de vérification ». Une lenteur de ce service ne doit pas bloquer les candidats.

Cette attente ouvre aussi la faille des enregistrements simultanés. Le programme a déjà lu « pas encore inscrit », « il reste de la place » et « le prochain numéro » avant l'appel. Deux requêtes qui attendent en même temps écrivent ensuite la même décision. INC-201, INC-202 et INC-203 apparaissent dans cette demi-heure pour cette raison. La faille existait déjà la veille, à Porto-Novo, sur un double clic de 200 ms. La panne du 19 novembre l'a multipliée.

## Impact chiffré

- 60 appels d'identité ont duré 5 secondes ou plus. Le plus court a pris 5,2 secondes, le plus long 61,7 secondes.
- 41 de ces appels bloquaient une inscription. Les 41 ont fini par un enregistrement (réponse 201), après l'attente.
- 19 bloquaient une convocation. Les 19 ont fini par s'afficher (réponse 200), après l'attente.
- 9 des 10 numéros de table en double du journal ont été attribués pendant cette demi-heure. Le dixième, `N-0574`, date de la veille.
- 6 des 7 inscriptions en double datent de cette demi-heure.
- Lokossa est passé de 296 à 307 inscrits, pour 300 places. Les 7 personnes au-dessus de la capacité sont celles de `sql/LOKOSSA.md`.

Aucune de ces 60 requêtes n'a reçu d'erreur. Le candidat voyait une page qui ne répondait pas, puis, parfois une minute plus tard, une inscription ou une convocation.

## Correction

L'appel d'identité est maintenant abandonné au bout de 5 secondes (`DELAI_IDENTITE_MS` dans `src/inscriptions/clients/identite.client.ts`). Si le service ne répond pas, l'inscription est enregistrée « en attente de vérification » et le candidat reçoit son numéro. S'il répond que le NPI est inconnu, l'inscription est refusée.

L'appel a lieu avant la transaction. Le contrôle « déjà inscrit », le compteur de places et le calcul du numéro se font ensuite, dans une seule transaction. Une attente de l'identité ne peut plus laisser deux requêtes écrire le même numéro.

Le test « enregistre l'inscription en attente si l'identité ne répond pas dans le délai » vérifie qu'un service muet ne retient plus la requête. Le test des 20 inscriptions simultanées vérifie qu'il n'y a ni numéro en double ni dépassement de capacité.

Les données déjà abîmées sont reprises par `sql/reparer_inscriptions.sql`. Les numéros en double sont séparés, les secondes inscriptions sont retirées, et deux index uniques empêchent le retour de ces deux cas. Les 307 inscriptions de Lokossa sont conservées : la direction des concours doit encore choisir pour les 7 personnes au-dessus des 300 places.

## Actions pour que cela ne se reproduise pas

- Garder le délai de 5 secondes sur tout appel au service d'identité, inscription comme convocation. Un client HTTP sans durée maximale ne doit plus être utilisé.
- Alerter dès qu'un appel d'identité dépasse 5 secondes. Le journal le marque déjà WARN : cette marque doit prévenir l'exploitation, pas seulement rester dans le fichier.
- Laisser l'identité hors de la transaction d'enregistrement, comme le code le fait maintenant, pour ne pas retenir les places pendant l'attente.
- Conserver les index uniques sur le numéro de table dans le centre et sur le couple NPI et concours.
- Demander au service d'identité un engagement sur son temps de réponse, et un essai de charge avant la prochaine campagne.
