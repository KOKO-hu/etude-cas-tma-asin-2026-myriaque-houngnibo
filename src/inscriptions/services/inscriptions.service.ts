import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { DELAI_IDENTITE_MS, identiteSansReponse, type ClientIdentite } from '../clients/identite.client.js';
import { MESSAGE_INSCRIPTION } from '../constants/messages.js';
import { STATUT_INSCRIPTION } from '../constants/statut-inscription.js';
import { RegleInscriptionError } from '../domain/regle-inscription.error.js';
import { aAuPlus35Ans, clotureDepassee, dateCalendrierValide, npiValide } from '../domain/regles.js';
import type { CreerInscriptionDto } from '../dto/creer-inscription.dto.js';
import { DepotSqlite, type InscriptionEnregistree } from '../repositories/depot-sqlite.js';

@Injectable()
export class InscriptionsService {
  constructor(
    private readonly depot: DepotSqlite,
    private readonly identite: ClientIdentite,
    private readonly maintenant: () => Date = () => new Date(),
    private readonly delaiIdentiteMs = DELAI_IDENTITE_MS,
  ) {}

  async creer(dto: CreerInscriptionDto): Promise<InscriptionEnregistree> {
    this.controlerForme(dto);

    const concours = this.depot.lireConcours(dto.concours);
    const centre = this.depot.lireCentre(dto.centre);
    if (!concours) throw new BadRequestException(MESSAGE_INSCRIPTION.CONCOURS_INCONNU);
    if (!centre) throw new BadRequestException(MESSAGE_INSCRIPTION.CENTRE_INCONNU);

    const instant = this.maintenant();
    if (clotureDepassee(instant, concours.clotureUtc)) {
      throw new ConflictException(MESSAGE_INSCRIPTION.CLOSES);
    }

    const anneeConcours = Number(concours.dateEpreuve.slice(0, 4));
    if (!aAuPlus35Ans(dto.dateNaissance, anneeConcours)) {
      throw new ConflictException(MESSAGE_INSCRIPTION.AGE);
    }

    const fiche = await this.interrogerIdentite(dto.npi);
    if (fiche.etat === 'inconnu') {
      throw new ConflictException(MESSAGE_INSCRIPTION.IDENTITE_INCONNUE);
    }

    try {
      return this.depot.enregistrer({
        npi: dto.npi,
        dateNaissance: dto.dateNaissance,
        nom: fiche.etat === 'connu' ? fiche.nom : '',
        prenoms: fiche.etat === 'connu' ? fiche.prenoms : '',
        concours,
        centre,
        statut: fiche.etat === 'connu' ? STATUT_INSCRIPTION.VALIDEE : STATUT_INSCRIPTION.EN_ATTENTE,
        creeLe: instant,
      });
    } catch (erreur) {
      if (erreur instanceof RegleInscriptionError) throw new ConflictException(erreur.message);
      throw erreur;
    }
  }

  private async interrogerIdentite(npi: string) {
    const signal = AbortSignal.timeout(this.delaiIdentiteMs);
    try {
      const fiche = await this.identite.consulter(npi, signal);
      if (!fiche) return { etat: 'inconnu' as const };
      return { etat: 'connu' as const, nom: fiche.nom, prenoms: fiche.prenoms };
    } catch (erreur) {
      if (identiteSansReponse(erreur, signal)) return { etat: 'sans_reponse' as const };
      throw erreur;
    }
  }

  private controlerForme(dto: CreerInscriptionDto): void {
    if (!npiValide(dto?.npi)) throw new BadRequestException(MESSAGE_INSCRIPTION.NPI);
    if (!dateCalendrierValide(dto?.dateNaissance)) throw new BadRequestException(MESSAGE_INSCRIPTION.DATE);
    if (!dto.concours || !dto.centre) throw new BadRequestException(MESSAGE_INSCRIPTION.CONCOURS_CENTRE);
  }
}
