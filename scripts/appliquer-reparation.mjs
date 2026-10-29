import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

const exportSql = process.argv[2] ?? 'base_inscriptions.sql';
const reparation = process.argv[3] ?? 'sql/reparer_inscriptions.sql';
const base = new DatabaseSync(':memory:');

base.exec('PRAGMA foreign_keys = OFF');
base.exec(fs.readFileSync(exportSql, 'utf8'));
base.exec(fs.readFileSync(reparation, 'utf8'));

const liste = base
  .prepare(
    `SELECT ordre.rang, candidat.nom, candidat.prenoms, inscription.npi, inscription.numero_table
     FROM (
       SELECT id, ROW_NUMBER() OVER (ORDER BY cree_le, id) AS rang
       FROM inscriptions
       WHERE centre_id = (SELECT id FROM centres WHERE code = 'L')
     ) AS ordre
     JOIN inscriptions AS inscription ON inscription.id = ordre.id
     JOIN candidats AS candidat ON candidat.npi = inscription.npi
     WHERE ordre.rang > (SELECT capacite FROM centres WHERE code = 'L')
     ORDER BY ordre.rang`,
  )
  .all();

console.log('Lokossa, inscriptions au-dessus de la capacité :');
for (const ligne of liste) {
  console.log(`${ligne.rang}  ${ligne.nom} ${ligne.prenoms}  ${ligne.npi}  ${ligne.numero_table}`);
}
