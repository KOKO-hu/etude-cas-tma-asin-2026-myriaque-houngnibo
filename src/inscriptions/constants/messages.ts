export const MESSAGE_INSCRIPTION = {
  NPI: 'Le NPI doit comporter exactement 10 chiffres.',
  DATE: 'Date de naissance invalide.',
  CONCOURS_CENTRE: 'Le concours et le centre sont obligatoires.',
  CONCOURS_INCONNU: 'Concours inconnu.',
  CENTRE_INCONNU: 'Centre inconnu.',
  CLOSES: 'Inscriptions closes pour ce concours.',
  AGE: "Âge limite dépassé : 35 ans au 31 décembre de l'année du concours.",
  IDENTITE_INCONNUE: "NPI inconnu du service d'identification.",
  DEJA_INSCRIT: 'Vous êtes déjà inscrit à ce concours.',
  MEME_JOUR: "Vous êtes déjà inscrit à un concours dont l'épreuve a lieu le même jour.",
  CENTRE_COMPLET: "Ce centre d'examen est complet.",
} as const;
