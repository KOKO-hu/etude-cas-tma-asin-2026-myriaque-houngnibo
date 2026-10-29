import { aAuPlus35Ans, clotureDepassee } from './regles.js';

describe('règles d’âge et de clôture', () => {
  it('accepte un candidat né le 20 juin 1991 pour un concours de 2026', () => {
    expect(aAuPlus35Ans('1991-06-20', 2026)).toBe(true);
  });

  it('accepte un candidat né le 1er janvier 1992, qui a 34 ans au 31 décembre 2026', () => {
    expect(aAuPlus35Ans('1992-01-01', 2026)).toBe(true);
  });

  it('accepte un candidat né le 1er janvier 1991, qui a exactement 35 ans', () => {
    expect(aAuPlus35Ans('1991-01-01', 2026)).toBe(true);
  });

  it('refuse un candidat né le 31 décembre 1990, qui a 36 ans', () => {
    expect(aAuPlus35Ans('1990-12-31', 2026)).toBe(false);
  });

  it('garde le Trésor ouvert à 22 h 59 au Bénin', () => {
    const clotureUtc = new Date('2026-11-20T22:59:00.000Z');
    const vingtDeuxHeuresCinquanteNeuf = new Date('2026-11-20T21:59:30.000Z');
    expect(clotureDepassee(vingtDeuxHeuresCinquanteNeuf, clotureUtc)).toBe(false);
  });

  it('garde le Trésor ouvert à 23 h 59 pile au Bénin', () => {
    const clotureUtc = new Date('2026-11-20T22:59:00.000Z');
    expect(clotureDepassee(clotureUtc, clotureUtc)).toBe(false);
  });

  it('ferme le Trésor après 23 h 59 au Bénin', () => {
    const clotureUtc = new Date('2026-11-20T22:59:00.000Z');
    expect(clotureDepassee(new Date('2026-11-20T22:59:01.000Z'), clotureUtc)).toBe(true);
  });
});
