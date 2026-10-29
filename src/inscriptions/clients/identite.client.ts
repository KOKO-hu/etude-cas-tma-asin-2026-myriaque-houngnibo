export const DELAI_IDENTITE_MS = 5000;

export type FicheIdentite = {
  nom: string;
  prenoms: string;
};

export interface ClientIdentite {
  consulter(npi: string, signal: AbortSignal): Promise<FicheIdentite | null>;
}

export function clientHttp(baseUrl: string): ClientIdentite {
  const racine = baseUrl.replace(/\/$/, '');
  return {
    async consulter(npi, signal) {
      const reponse = await fetch(`${racine}/identite/${npi}`, { signal });
      if (reponse.status === 404) return null;
      if (!reponse.ok) {
        throw new Error(`Service d'identité indisponible (${reponse.status}).`);
      }
      const corps = (await reponse.json()) as Partial<FicheIdentite>;
      return {
        nom: corps.nom ?? '',
        prenoms: corps.prenoms ?? '',
      };
    },
  };
}

export function identiteSansReponse(erreur: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true;
  if (!(erreur instanceof Error)) return false;
  return erreur.name === 'AbortError' || erreur.name === 'TimeoutError' || erreur.name === 'TypeError';
}
