export function aAuPlus35Ans(dateNaissance: string, anneeConcours: number): boolean {
  const premierJourEncoreRecevable = `${anneeConcours - 35}-01-01`;
  return dateNaissance >= premierJourEncoreRecevable;
}

export function clotureDepassee(maintenant: Date, clotureUtc: Date): boolean {
  return maintenant.getTime() > clotureUtc.getTime();
}

export function npiValide(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && /^\d{10}$/.test(valeur);
}

export function dateCalendrierValide(valeur: unknown): valeur is string {
  if (typeof valeur !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false;
  const [annee, mois, jour] = valeur.split('-').map(Number);
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  return date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour;
}
