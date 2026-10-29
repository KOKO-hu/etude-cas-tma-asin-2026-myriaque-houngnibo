import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MESSAGE_INSCRIPTION } from '../constants/messages.js';
import { CreerInscriptionDto } from './creer-inscription.dto.js';

describe('CreerInscriptionDto', () => {
  it('accepte une demande complète', async () => {
    const erreurs = await valider({
      npi: '3076016910',
      dateNaissance: '1991-06-20',
      concours: 'DOUANES',
      centre: 'P',
    });
    expect(erreurs).toEqual([]);
  });

  it('refuse un NPI qui ne fait pas 10 chiffres', async () => {
    const erreurs = await valider({
      npi: '123',
      dateNaissance: '1991-06-20',
      concours: 'DOUANES',
      centre: 'P',
    });
    expect(erreurs.join(' ')).toContain(MESSAGE_INSCRIPTION.NPI);
  });

  it('refuse une date de naissance impossible', async () => {
    const erreurs = await valider({
      npi: '3076016910',
      dateNaissance: '1991-02-31',
      concours: 'DOUANES',
      centre: 'P',
    });
    expect(erreurs.join(' ')).toContain(MESSAGE_INSCRIPTION.DATE);
  });
});

function valider(corps: Record<string, string>): Promise<string[]> {
  const dto = plainToInstance(CreerInscriptionDto, corps);
  return validate(dto).then((erreurs) => erreurs.flatMap((erreur) => Object.values(erreur.constraints ?? {})));
}
