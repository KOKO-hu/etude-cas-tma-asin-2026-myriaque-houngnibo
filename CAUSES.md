# Causes racines

Ce document dit, pour chaque incident, ce que le candidat a constaté, ce que le programme fait réellement, et pourquoi cela produit le problème. Les heures sont celles du Bénin, une heure de plus que l'heure UTC écrite dans le journal. Le journal va du 18 novembre 2026 à 1 h 00 au 21 novembre à 8 h 00.

Le NPI est le numéro d'identification du candidat. Le numéro de table est la place d'examen, par exemple `P-0464` pour Parakou.

## INC-201 — deux candidats ont la place P-0464

**Ce qui a été vu.** Au centre de Parakou, deux candidats ont reçu la même place, `P-0464`.

**Ce que fait le programme.** Au moment d'inscrire quelqu'un, il cherche le plus grand numéro déjà donné dans le centre, ajoute 1, puis enregistre. Entre les deux, il appelle le service d'identité et attend sa réponse. La base n'interdit pas d'enregistrer deux fois le même numéro : elle n'a qu'une clé primaire, aucune règle du type « un numéro de table n'existe qu'une fois dans un centre ».

**Pourquoi le numéro sort en double.** Deux inscriptions partent en même temps. Les deux lisent le même maximum, par exemple 463. Les deux calculent donc 464. Chacune attend ensuite l'identité. Au retour, chacune enregistre `P-0464`. La seconde ne voit pas que la première a pris le numéro, parce que le calcul a été fait avant.

**Ce que le journal montre.** Le 19 novembre à 09:21:39 et à 09:21:47, `P-0464` est donné à deux NPI différents, tous deux aux douanes à Parakou. Ce n'est pas le seul cas : 10 numéros du journal sont attribués plusieurs fois, à Cotonou, Lokossa, Parakou et Porto-Novo.

## INC-202 — Lokossa a 307 inscrits pour 300 places

**Ce qui a été vu.** Le centre de Lokossa dépasse sa capacité. La limite est de 300 inscrits, tous concours confondus.

**Ce que fait le programme.** Il compte les inscriptions déjà enregistrées dans le centre. Si le compte est encore sous 300, il accepte. Ce compte est fait au début. L'enregistrement n'a lieu qu'après l'appel au service d'identité. Rien ne bloque les autres demandes pendant ce temps.

**Pourquoi la salle se remplit trop.** Le 19 novembre au matin, Lokossa est à 296 inscrits. Onze personnes lancent leur inscription ensemble, pendant que l'identité répond très lentement. Chacune compte, voit 296, et conclut qu'il reste de la place. Les onze sont ensuite enregistrées. Le centre passe à 307. Les numéros le confirment : `L-0297` a été donné 5 fois et `L-0298` 6 fois, entre 09:11 et 09:12, toutes aux impôts.

**Suite à donner.** Ces onze personnes ont une inscription. Il ne faut en supprimer aucune sans décision. La direction des concours doit dire lesquelles restent au-delà des 300 places.

## INC-203 — un candidat a deux convocations

**Ce qui a été vu.** La page ne répondait pas. Le candidat a cliqué une seconde fois sur « Valider ». Il a deux convocations.

**Ce que fait le programme.** Avant d'enregistrer, il vérifie qu'il n'existe pas déjà une inscription pour ce NPI et ce concours. Si la vérification ne trouve rien, il continue, appelle l'identité, puis écrit. La base n'interdit pas deux lignes pour le même candidat et le même concours.

**Pourquoi le second clic passe.** Le premier clic n'a pas encore été enregistré quand le second arrive. Les deux vérifications répondent « pas encore inscrit ». Les deux enregistrements sont créés. Chaque inscription a sa convocation.

**Ce que le journal montre.** Sept candidats sont inscrits deux fois au même concours. Six de ces doublons tombent le 19 novembre au matin, quand les pages ne répondent plus et que les candidats recliquent. Le septième est à Porto-Novo le 18 novembre à 16:42 : le même NPI est enregistré deux fois aux douanes, à 200 millisecondes d'écart, alors que l'identité répondait normalement. Un double clic rapide suffit. La lenteur du lendemain n'est pas nécessaire, elle multiplie les cas.

## INC-204 — « inscriptions closes » dès 22 h 59

**Ce qui a été vu.** Le concours du Trésor fermait le 20 novembre à 23 h 59. Dès 22 h 59, les candidats ont reçu « Inscriptions closes ».

**Ce que fait le programme.** L'heure de clôture est rangée en UTC. Pour le Trésor, la base contient `2026-11-20 22:59:00`. En UTC, 22 h 59 correspond bien à 23 h 59 au Bénin : la valeur stockée est la bonne. Le serveur, lui, est réglé sur l'heure du Bénin. Pour décider, il compare son horloge locale à la valeur lue, sans remettre cette valeur à l'heure du Bénin.

**Pourquoi la fermeture a une heure d'avance.** À 22 h 59 au Bénin, l'horloge du serveur affiche 22:59 et la base contient 22:59. Le programme les traite comme la même heure et ferme. Il est pourtant encore 22 h 59 au Bénin : la vraie limite, 23 h 59, n'est pas atteinte. Le décalage est d'une heure, celle qui sépare le Bénin de l'UTC.

**Ce que le journal montre.** La dernière inscription au Trésor acceptée est le 20 novembre à 22:58:44. Le premier refus est à 22:59:05. De 22:59:05 à 23:58:58, 147 candidats sont refusés alors que les inscriptions devaient rester ouvertes. À partir de 23:59:20, 80 autres refus sont justes : l'heure était vraiment dépassée.

**Ce qui se reproduira.** Les douanes et les impôts ferment le 30 novembre, avec la même heure stockée en UTC, 22:59. Sans correction, ils fermeront eux aussi à 22 h 59 au Bénin.

## INC-205 — un candidat de 35 ans est déclaré trop âgé

**Ce qui a été vu.** Un candidat né le 20 juin 1991 a été refusé. Au 31 décembre 2026, il a 35 ans. La limite est « 35 ans au plus » à cette date. Il devait être accepté.

**Ce que fait le programme.** Il compte le nombre de jours entre la date de naissance et le 31 décembre 2026, divise par 365, et refuse si le résultat dépasse 35. Il ne calcule pas l'âge en années.

**Pourquoi un candidat encore dans la limite est refusé.** Une année civile n'a pas toujours 365 jours. Entre 1992 et 2024, plusieurs 29 février s'ajoutent. Pour le candidat du 20 juin 1991, le nombre de jours divisé par 365 dépasse 35, alors qu'il n'a pas encore 36 ans : il les aura le 20 juin 2027. Le programme refuse sur ce dépassement de quelques jours.

**Ce que le journal montre.** Le 19 novembre à 14:22:41, ce candidat est refusé pour le Trésor avec le message « Âge limite dépassé ». Sur 78 refus d'âge, 36 concernent des personnes qui ont encore 35 ans ou moins au 31 décembre 2026. Deux d'entre elles sont nées début 1992 : elles n'ont que 34 ans. Les 42 autres refus concernent des personnes de 36 ans ou plus : ceux-là sont justes.

## INC-206 — pendant une demi-heure, plus personne ne passe

**Ce qui a été vu.** Le 19 novembre au matin, pendant environ une demi-heure, les pages d'inscription et de convocation tournaient sans fin.

**Ce que fait le programme.** Avant d'enregistrer une inscription, il demande au service national d'identité si le NPI existe. Pour afficher une convocation, il rappelle ce service afin d'obtenir le nom et les prénoms. L'appel utilise un client HTTP ordinaire, sans durée maximale. Le programme attend la réponse, quelle que soit sa lenteur.

**Ce qui était prévu.** Si l'identité ne répond pas dans les 5 secondes, l'inscription doit quand même être enregistrée, avec le statut « en attente de vérification ». Une lenteur de ce service ne doit pas bloquer les candidats.

**Pourquoi tout s'est arrêté.** Le 19 novembre, de 09:09:53 à 09:39:49, le service d'identité a mis 5 secondes ou plus sur 60 requêtes, parfois environ 40 secondes. Chaque inscription et chaque convocation est restée en attente pendant tout ce temps. Pour le candidat, la page ne répond plus. Il ne s'agit pas d'une panne de la base : les autres pages, comme la liste des concours, continuaient de répondre.

## INC-207 — la liste de Cotonou met plus de 40 secondes

**Ce qui a été vu.** Afficher les inscrits du centre de Cotonou prend plus de 40 secondes. La règle demande moins de 2 secondes, même avec 5 000 inscrits.

**Ce que fait le programme.** Il charge d'abord les inscriptions du centre et du concours. Ensuite, pour chaque inscrit, il fait une nouvelle lecture afin de retrouver le candidat. Avec 2 000 inscrits, cela fait une lecture de la liste plus environ 2 000 lectures individuelles. La base n'a pas d'index pour accélérer ces recherches : seulement les clés primaires, c'est-à-dire l'identifiant de chaque ligne.

**Pourquoi Cotonou est le centre signalé.** C'est le plus gros centre, 6 000 places. Plus il y a d'inscrits, plus il y a de lectures, plus l'affichage est long. Sur 18 affichages de Cotonou dans le journal, la moyenne est d'environ 25 secondes et le maximum de 46 secondes, pour au plus 2 408 lignes. Trois de ces affichages dépassent 40 secondes. Les autres centres dépassent aussi souvent les 2 secondes. Cotonou est le seul à dépasser 40 secondes. Les données affichées sont justes : la page est lente, elle n'est pas fausse.

## INC-208 — le candidat ne peut pas s'inscrire aux impôts

**Ce qui a été vu.** Une personne inscrite aux douanes n'a pas pu s'inscrire aux impôts.

**Pourquoi ce n'est pas une anomalie.** Les deux épreuves ont lieu le même jour, le 12 décembre 2026. La règle l'interdit : un candidat ne passe pas deux concours le même jour. Le programme a refusé, avec le message « déjà inscrit à un concours dont l'épreuve a lieu le même jour ». Le journal contient 3 refus de ce type. Le signalement décrit le comportement attendu.

## Comment les incidents se tiennent

INC-201, INC-202 et INC-203 sont le même trou dans le traitement. Le programme décide en regardant la base, puis il appelle l'identité, puis seulement il écrit. Pendant l'attente, une autre demande peut prendre la même décision à partir de la même information. Le numéro de table, la place restante et le « déjà inscrit » sont trois décisions de ce genre. Comme la base n'empêche ni le numéro en double, ni l'inscription en double, la seconde écriture est acceptée.

INC-206 agrandit ce trou. Quand l'identité met 20 ou 40 secondes, beaucoup de demandes restent en cours en même temps, et les candidats recliquent. Neuf des dix numéros en double, six des sept inscriptions en double, et les onze inscriptions de trop à Lokossa tombent dans la demi-heure du 19 novembre, de 09:09 à 09:39. Le cas de Porto-Novo, la veille, à 200 millisecondes d'écart, montre que le trou existe aussi quand l'identité répond vite.

INC-204 et INC-205 ne viennent pas de cette attente. Ce sont deux règles mal appliquées, et elles continuent après le 19 novembre. L'une ferme le concours une heure trop tôt parce qu'elle mélange l'heure du Bénin et l'heure UTC. L'autre refuse des candidats encore dans la limite d'âge parce qu'elle divise un nombre de jours par 365. Les deux écartent des personnes qui devaient pouvoir s'inscrire.

INC-207 est un troisième problème. La liste finit par s'afficher, et les noms sont les bons. Elle est lente parce que chaque inscrit provoque une lecture séparée, sur une base sans index adapté. Elle le devient davantage à chaque nouvelle inscription. Elle ne crée ni numéro en double, ni refus à tort.

INC-208 n'a pas de cause à corriger. Le refus des impôts pour un candidat déjà inscrit aux douanes est la règle du même jour d'épreuve.
