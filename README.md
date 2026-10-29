
## Analyse du journal

Les heures affichées sont celles du Bénin (UTC+1).

```bash
node scripts/analyse-journal.mjs journal_production.log
```

Le même lancement passe par npm :

```bash
npm run analyse -- journal_production.log
```

## Inscription

`POST /api/inscriptions` reçoit `{ "npi", "dateNaissance", "concours", "centre" }`. Le corps est validé par un DTO. L'âge est décidé au 31 décembre de l'année du concours. La clôture stockée en UTC est comparée à l'instant réel : le Trésor ferme le 20 novembre à 23 h 59, heure du Bénin. L'appel au service d'identité est abandonné au bout de 5 secondes et l'inscription est alors « en attente de vérification ». Le doublon, la capacité et le numéro de table sont décidés dans une seule transaction.

`IDENTITE_URL` pointe vers le service d'identité. Par défaut : `http://localhost:4000`.

```bash
npm test
```

