-- Réparation rejouable de l'export « Inscriptions aux concours ».
-- Moteur vérifié : SQLite. Les instants cree_le restent en UTC.
--
-- 1. Les numéros de table en double dans un centre : la première inscription
--    (cree_le, puis id) conserve le numéro, les suivantes reçoivent la suite
--    du plus grand numéro du centre.
-- 2. Les inscriptions en double (même NPI, même concours) : on garde la
--    première et on retire les suivantes. Aucune inscription de Lokossa
--    n'est retirée.
-- 3. Deux index uniques empêchent le retour de ces deux cas.
--
-- Lokossa reste à 307 inscrits pour 300 places. La contrainte de capacité
-- n'est pas posée : elle serait fausse tant que la direction des concours
-- n'a pas tranché. La liste à lui soumettre est la requête finale.
-- Décision et destinataires : sql/LOKOSSA.md.

BEGIN;

UPDATE inscriptions
SET numero_table = attribution.numero
FROM (
  SELECT
    doublon.id AS id,
    centre.code || '-' || printf('%04d', maximum.valeur + doublon.rang) AS numero
  FROM (
    SELECT
      copie.id,
      copie.centre_id,
      ROW_NUMBER() OVER (PARTITION BY copie.centre_id ORDER BY copie.cree_le, copie.id) AS rang
    FROM (
      SELECT
        id,
        centre_id,
        cree_le,
        ROW_NUMBER() OVER (
          PARTITION BY centre_id, numero_table
          ORDER BY cree_le, id
        ) AS copie
      FROM inscriptions
    ) AS copie
    WHERE copie.copie > 1
  ) AS doublon
  JOIN centres AS centre ON centre.id = doublon.centre_id
  JOIN (
    SELECT centre_id, MAX(CAST(substr(numero_table, 3) AS INTEGER)) AS valeur
    FROM inscriptions
    GROUP BY centre_id
  ) AS maximum ON maximum.centre_id = doublon.centre_id
) AS attribution
WHERE inscriptions.id = attribution.id;

DELETE FROM inscriptions
WHERE id IN (
  SELECT a_retirer.id
  FROM (
    SELECT
      inscription.id,
      inscription.centre_id
    FROM (
      SELECT
        id,
        centre_id,
        ROW_NUMBER() OVER (
          PARTITION BY concours_id, npi
          ORDER BY cree_le, id
        ) AS copie
      FROM inscriptions
    ) AS inscription
    WHERE inscription.copie > 1
  ) AS a_retirer
  JOIN centres AS centre ON centre.id = a_retirer.centre_id
  WHERE centre.code <> 'L'
);

CREATE UNIQUE INDEX IF NOT EXISTS inscriptions_centre_numero
  ON inscriptions (centre_id, numero_table);

CREATE UNIQUE INDEX IF NOT EXISTS inscriptions_concours_npi
  ON inscriptions (concours_id, npi);

COMMIT;

-- Liste à soumettre. Les rangs au-dessus de la capacité sont entrés après
-- les 300 premières inscriptions de Lokossa. Aucune ligne n'est supprimée.
SELECT
  ordre.rang,
  candidat.nom,
  candidat.prenoms,
  inscription.npi,
  concours.code AS concours,
  inscription.numero_table,
  inscription.cree_le AS cree_le_utc
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY cree_le, id) AS rang
  FROM inscriptions
  WHERE centre_id = (SELECT id FROM centres WHERE code = 'L')
) AS ordre
JOIN inscriptions AS inscription ON inscription.id = ordre.id
JOIN candidats AS candidat ON candidat.npi = inscription.npi
JOIN concours AS concours ON concours.id = inscription.concours_id
WHERE ordre.rang > (SELECT capacite FROM centres WHERE code = 'L')
ORDER BY ordre.rang;
