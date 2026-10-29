import { DatabaseSync } from 'node:sqlite';
import type { StatutInscription } from '../constants/statut-inscription.js';
import { MESSAGE_INSCRIPTION } from '../constants/messages.js';
import { RegleInscriptionError } from '../domain/regle-inscription.error.js';

export type Concours = {
  id: number;
  code: string;
  dateEpreuve: string;
  clotureUtc: Date;
};

export type Centre = {
  id: number;
  code: string;
  capacite: number;
};

type Enregistrement = {
  npi: string;
  dateNaissance: string;
  nom: string;
  prenoms: string;
  concours: Concours;
  centre: Centre;
  statut: StatutInscription;
  creeLe: Date;
};

export type InscriptionEnregistree = {
  id: number;
  numero: string;
  statut: StatutInscription;
  npi: string;
  concours: string;
  centre: string;
};

type LigneConcours = {
  id: number;
  code: string;
  date_epreuve: string;
  cloture: string;
};

type LigneCentre = {
  id: number;
  code: string;
  capacite: number;
};

export class DepotSqlite {
  private readonly db: DatabaseSync;

  constructor(chemin: string) {
    this.db = new DatabaseSync(chemin);
    this.db.exec('PRAGMA foreign_keys = ON');
    this.db.exec('PRAGMA busy_timeout = 5000');
  }

  assurerSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS concours (
        id INTEGER PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        libelle VARCHAR(100) NOT NULL,
        date_epreuve DATE NOT NULL,
        cloture TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS centres (
        id INTEGER PRIMARY KEY,
        code VARCHAR(1) NOT NULL UNIQUE,
        nom VARCHAR(50) NOT NULL,
        capacite INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS candidats (
        id INTEGER PRIMARY KEY,
        npi VARCHAR(10) NOT NULL UNIQUE,
        nom VARCHAR(60) NOT NULL,
        prenoms VARCHAR(80) NOT NULL,
        date_naissance DATE NOT NULL,
        cree_le TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inscriptions (
        id INTEGER PRIMARY KEY,
        concours_id INTEGER NOT NULL REFERENCES concours (id),
        centre_id INTEGER NOT NULL REFERENCES centres (id),
        npi VARCHAR(10) NOT NULL,
        numero_table VARCHAR(6) NOT NULL,
        statut VARCHAR(30) NOT NULL,
        cree_le TIMESTAMP NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS inscriptions_npi_concours
        ON inscriptions (concours_id, npi);
      CREATE UNIQUE INDEX IF NOT EXISTS inscriptions_centre_numero
        ON inscriptions (centre_id, numero_table);
    `);
  }

  assurerReferentiel(): void {
    const insererConcours = this.db.prepare(
      'INSERT OR IGNORE INTO concours (id, code, libelle, date_epreuve, cloture) VALUES (?, ?, ?, ?, ?)',
    );
    insererConcours.run(1, 'DOUANES', 'Concours des inspecteurs des douanes', '2026-12-12', '2026-11-30 22:59:00');
    insererConcours.run(2, 'IMPOTS', 'Concours des contrôleurs des impôts', '2026-12-12', '2026-11-30 22:59:00');
    insererConcours.run(3, 'TRESOR', 'Concours des agents du Trésor public', '2026-12-19', '2026-11-20 22:59:00');

    const insererCentre = this.db.prepare('INSERT OR IGNORE INTO centres (id, code, nom, capacite) VALUES (?, ?, ?, ?)');
    insererCentre.run(1, 'C', 'Cotonou', 6000);
    insererCentre.run(2, 'P', 'Parakou', 700);
    insererCentre.run(3, 'L', 'Lokossa', 300);
    insererCentre.run(4, 'N', 'Porto-Novo', 800);
    insererCentre.run(5, 'A', 'Abomey', 600);
  }

  lireConcours(code: string): Concours | null {
    const ligne = this.db
      .prepare('SELECT id, code, date_epreuve, cloture FROM concours WHERE code = ?')
      .get(code) as LigneConcours | undefined;
    if (!ligne) return null;
    return {
      id: ligne.id,
      code: ligne.code,
      dateEpreuve: ligne.date_epreuve,
      clotureUtc: new Date(`${ligne.cloture.replace(' ', 'T')}Z`),
    };
  }

  lireCentre(code: string): Centre | null {
    const ligne = this.db.prepare('SELECT id, code, capacite FROM centres WHERE code = ?').get(code) as
      | LigneCentre
      | undefined;
    return ligne ?? null;
  }

  definirCapacite(codeCentre: string, capacite: number): void {
    this.db.prepare('UPDATE centres SET capacite = ? WHERE code = ?').run(capacite, codeCentre);
  }

  numerosDuCentre(codeCentre: string): string[] {
    const lignes = this.db
      .prepare(
        `SELECT i.numero_table AS numero
         FROM inscriptions i
         JOIN centres c ON c.id = i.centre_id
         WHERE c.code = ?
         ORDER BY i.id`,
      )
      .all(codeCentre) as { numero: string }[];
    return lignes.map((ligne) => ligne.numero);
  }

  enregistrer(donnees: Enregistrement): InscriptionEnregistree {
    try {
      return this.transaction(() => this.ecrire(donnees));
    } catch (erreur) {
      if (erreur instanceof RegleInscriptionError) throw erreur;
      if (erreur instanceof Error && erreur.message.includes('UNIQUE')) {
        throw new RegleInscriptionError(MESSAGE_INSCRIPTION.DEJA_INSCRIT);
      }
      throw erreur;
    }
  }

  fermer(): void {
    this.db.close();
  }

  private ecrire(donnees: Enregistrement): InscriptionEnregistree {
    const dejaInscrit = this.db
      .prepare('SELECT id FROM inscriptions WHERE concours_id = ? AND npi = ?')
      .get(donnees.concours.id, donnees.npi);
    if (dejaInscrit) throw new RegleInscriptionError(MESSAGE_INSCRIPTION.DEJA_INSCRIT);

    const memeJour = this.db
      .prepare(
        `SELECT i.id
         FROM inscriptions i
         JOIN concours c ON c.id = i.concours_id
         WHERE i.npi = ? AND c.date_epreuve = ? AND i.concours_id != ?`,
      )
      .get(donnees.npi, donnees.concours.dateEpreuve, donnees.concours.id);
    if (memeJour) throw new RegleInscriptionError(MESSAGE_INSCRIPTION.MEME_JOUR);

    const compte = this.db
      .prepare('SELECT COUNT(*) AS total FROM inscriptions WHERE centre_id = ?')
      .get(donnees.centre.id) as { total: number };
    const centreActuel = this.db
      .prepare('SELECT capacite FROM centres WHERE id = ?')
      .get(donnees.centre.id) as { capacite: number };
    if (compte.total >= centreActuel.capacite) {
      throw new RegleInscriptionError(MESSAGE_INSCRIPTION.CENTRE_COMPLET);
    }

    const numero = numeroSuivant(this.numerosExistants(donnees.centre.id), donnees.centre.code);
    const creeLe = donnees.creeLe.toISOString().slice(0, 19).replace('T', ' ');

    const candidat = this.db.prepare('SELECT id FROM candidats WHERE npi = ?').get(donnees.npi);
    if (!candidat) {
      this.db
        .prepare('INSERT INTO candidats (npi, nom, prenoms, date_naissance, cree_le) VALUES (?, ?, ?, ?, ?)')
        .run(donnees.npi, donnees.nom, donnees.prenoms, donnees.dateNaissance, creeLe);
    }

    const insertion = this.db
      .prepare(
        'INSERT INTO inscriptions (concours_id, centre_id, npi, numero_table, statut, cree_le) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(donnees.concours.id, donnees.centre.id, donnees.npi, numero, donnees.statut, creeLe);

    return {
      id: Number(insertion.lastInsertRowid),
      numero,
      statut: donnees.statut,
      npi: donnees.npi,
      concours: donnees.concours.code,
      centre: donnees.centre.code,
    };
  }

  private numerosExistants(centreId: number): string[] {
    const lignes = this.db
      .prepare('SELECT numero_table AS numero FROM inscriptions WHERE centre_id = ?')
      .all(centreId) as { numero: string }[];
    return lignes.map((ligne) => ligne.numero);
  }

  private transaction<T>(travail: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const resultat = travail();
      this.db.exec('COMMIT');
      return resultat;
    } catch (erreur) {
      try {
        this.db.exec('ROLLBACK');
      } catch {
        // La transaction est déjà close.
      }
      throw erreur;
    }
  }
}

function numeroSuivant(numeros: string[], codeCentre: string): string {
  const maximum = numeros.reduce((plusGrand, numero) => {
    const valeur = Number(numero.slice(codeCentre.length + 1));
    return Number.isInteger(valeur) ? Math.max(plusGrand, valeur) : plusGrand;
  }, 0);
  return `${codeCentre}-${String(maximum + 1).padStart(4, '0')}`;
}
