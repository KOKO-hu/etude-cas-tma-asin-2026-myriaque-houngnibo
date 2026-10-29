export const STATUT_INSCRIPTION = {
  VALIDEE: 'validee',
  EN_ATTENTE: 'en attente de vérification',
} as const;

export type StatutInscription = (typeof STATUT_INSCRIPTION)[keyof typeof STATUT_INSCRIPTION];
