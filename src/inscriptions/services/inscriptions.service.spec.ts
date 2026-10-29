import { BadRequestException, ConflictException } from '@nestjs/common';
import type { ClientIdentite, FicheIdentite } from '../clients/identite.client.js';
import { DELAI_IDENTITE_MS } from '../clients/identite.client.js';
import { MESSAGE_INSCRIPTION } from '../constants/messages.js';
import { STATUT_INSCRIPTION } from '../constants/statut-inscription.js';
import type { CreerInscriptionDto } from '../dto/creer-inscription.dto.js';
import { DepotSqlite } from '../repositories/depot-sqlite.js';
import { InscriptionsService } from './inscriptions.service.js';

const OUVERT = new Date('2026-11-18T10:00:00.000Z');

describe('InscriptionsService', () => {
  let depot: DepotSqlite;
  let service: InscriptionsService;

  beforeEach(() => {
    ({ depot, service } = monter());
  });

  afterEach(() => {
    depot.fermer();
  });

  it('inscrit un candidat et lui donne le prochain numéro du centre', async () => {
    const inscription = await service.creer(demande());

    expect(inscription).toMatchObject({
      numero: 'P-0001',
      statut: STATUT_INSCRIPTION.VALIDEE,
      npi: '3076016910',
      concours: 'DOUANES',
      centre: 'P',
    });
  });

  it('accepte le candidat né le 20 juin 1991', async () => {
    const inscription = await service.creer(demande({ dateNaissance: '1991-06-20' }));
    expect(inscription.statut).toBe(STATUT_INSCRIPTION.VALIDEE);
  });

  it('refuse un candidat qui a 36 ans au 31 décembre 2026', async () => {
    await expect(service.creer(demande({ dateNaissance: '1990-12-31' }))).rejects.toThrow(MESSAGE_INSCRIPTION.AGE);
    expect(depot.numerosDuCentre('P')).toEqual([]);
  });

  it('laisse le Trésor ouvert à 22 h 59 au Bénin le 20 novembre', async () => {
    const { service: tresor, depot: base } = monter({
      maintenant: () => new Date('2026-11-20T21:59:30.000Z'),
    });
    const inscription = await tresor.creer(demande({ concours: 'TRESOR', npi: '1111111111' }));
    expect(inscription.concours).toBe('TRESOR');
    base.fermer();
  });

  it('refuse le Trésor après 23 h 59 au Bénin', async () => {
    const { service: tresor, depot: base } = monter({
      maintenant: () => new Date('2026-11-20T22:59:01.000Z'),
    });
    await expect(tresor.creer(demande({ concours: 'TRESOR' }))).rejects.toThrow(MESSAGE_INSCRIPTION.CLOSES);
    expect(base.numerosDuCentre('P')).toEqual([]);
    base.fermer();
  });

  it('refuse une seconde inscription au même concours', async () => {
    await service.creer(demande());
    await expect(service.creer(demande({ centre: 'C' }))).rejects.toThrow(MESSAGE_INSCRIPTION.DEJA_INSCRIT);
  });

  it('refuse un second concours le même jour et accepte une épreuve un autre jour', async () => {
    await service.creer(demande());
    await expect(service.creer(demande({ concours: 'IMPOTS' }))).rejects.toThrow(MESSAGE_INSCRIPTION.MEME_JOUR);

    const tresor = await service.creer(demande({ concours: 'TRESOR' }));
    expect(tresor.numero).toBe('P-0002');
  });

  it("refuse un NPI inconnu et n'enregistre rien", async () => {
    const { service: inconnu, depot: base } = monter({ identite: new IdentitePilotable('inconnu') });
    await expect(inconnu.creer(demande())).rejects.toThrow(MESSAGE_INSCRIPTION.IDENTITE_INCONNUE);
    expect(base.numerosDuCentre('P')).toEqual([]);
    base.fermer();
  });

  it("enregistre l'inscription en attente si l'identité ne répond pas dans le délai", async () => {
    const { service: lent, depot: base } = monter({
      identite: new IdentitePilotable('muet'),
      delaiIdentiteMs: 80,
    });
    const debut = Date.now();
    const inscription = await lent.creer(demande());

    expect(inscription.statut).toBe(STATUT_INSCRIPTION.EN_ATTENTE);
    expect(inscription.numero).toBe('P-0001');
    expect(Date.now() - debut).toBeLessThan(1000);
    expect(DELAI_IDENTITE_MS).toBe(5000);
    base.fermer();
  });

  it('refuse un NPI qui ne fait pas 10 chiffres', async () => {
    const erreur = await service.creer(demande({ npi: '123' })).catch((valeur: unknown) => valeur);
    expect(erreur).toBeInstanceOf(BadRequestException);
    expect((erreur as BadRequestException).message).toBe(MESSAGE_INSCRIPTION.NPI);
  });

  it('refuse l’âge avec une ConflictException', async () => {
    const erreur = await service.creer(demande({ dateNaissance: '1990-12-31' })).catch((valeur: unknown) => valeur);
    expect(erreur).toBeInstanceOf(ConflictException);
  });

  it("n'attribue ni numéro en double ni place au-dessus de la capacité quand les requêtes sont simultanées", async () => {
    const { service: charge, depot: base } = monter({
      identite: new IdentitePilotable('connu', 40),
      capaciteParakou: 5,
    });

    const resultats = await Promise.all(
      Array.from({ length: 20 }, (_valeur, index) =>
        charge.creer(demande({ npi: String(1_000_000_000 + index) })).then(
          (inscription) => ({ ok: true as const, numero: inscription.numero }),
          (erreur: unknown) => ({ ok: false as const, message: messageDe(erreur) }),
        ),
      ),
    );

    const acceptees = resultats.filter((resultat) => resultat.ok);
    const refusees = resultats.filter((resultat) => !resultat.ok);
    const numeros = base.numerosDuCentre('P');

    expect(acceptees).toHaveLength(5);
    expect(refusees).toHaveLength(15);
    expect(refusees.every((refus) => refus.message === MESSAGE_INSCRIPTION.CENTRE_COMPLET)).toBe(true);
    expect(numeros).toEqual(['P-0001', 'P-0002', 'P-0003', 'P-0004', 'P-0005']);
    base.fermer();
  });

  it("n'inscrit qu'une fois le candidat qui valide plusieurs fois en parallèle", async () => {
    const { service: charge, depot: base } = monter({
      identite: new IdentitePilotable('connu', 40),
    });

    const resultats = await Promise.all(
      Array.from({ length: 12 }, () =>
        charge.creer(demande()).then(
          () => 'acceptee' as const,
          (erreur: unknown) => messageDe(erreur),
        ),
      ),
    );

    expect(resultats.filter((resultat) => resultat === 'acceptee')).toHaveLength(1);
    expect(resultats.filter((resultat) => resultat === MESSAGE_INSCRIPTION.DEJA_INSCRIT)).toHaveLength(11);
    expect(base.numerosDuCentre('P')).toEqual(['P-0001']);
    base.fermer();
  });
});

class IdentitePilotable implements ClientIdentite {
  constructor(
    private readonly comportement: 'connu' | 'inconnu' | 'muet',
    private readonly pauseMs = 0,
  ) {}

  async consulter(_npi: string, signal: AbortSignal): Promise<FicheIdentite | null> {
    if (this.pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, this.pauseMs));
    if (this.comportement === 'muet') {
      await new Promise<never>((_resolve, reject) => {
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    }
    if (this.comportement === 'inconnu') return null;
    return { nom: 'DOSSOU', prenoms: 'Amina' };
  }
}

function monter(options?: {
  identite?: ClientIdentite;
  maintenant?: () => Date;
  delaiIdentiteMs?: number;
  capaciteParakou?: number;
}) {
  const base = new DepotSqlite(':memory:');
  base.assurerSchema();
  base.assurerReferentiel();
  if (options?.capaciteParakou !== undefined) base.definirCapacite('P', options.capaciteParakou);
  const inscriptions = new InscriptionsService(
    base,
    options?.identite ?? new IdentitePilotable('connu'),
    options?.maintenant ?? (() => OUVERT),
    options?.delaiIdentiteMs,
  );
  return { depot: base, service: inscriptions };
}

function demande(partiel: Partial<CreerInscriptionDto> = {}): CreerInscriptionDto {
  return {
    npi: '3076016910',
    dateNaissance: '1998-04-12',
    concours: 'DOUANES',
    centre: 'P',
    ...partiel,
  };
}

function messageDe(erreur: unknown): string {
  return erreur instanceof Error ? erreur.message : String(erreur);
}
