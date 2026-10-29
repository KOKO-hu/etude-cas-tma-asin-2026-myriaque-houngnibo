# Inscriptions aux concours

Node.js 22 ou plus récent. Depuis la racine du dépôt :

```bash
npm install
```

## Analyse du journal

Le programme lit le journal fourni avec le sujet. Les heures affichées sont celles du Bénin (UTC+1).

```bash
node scripts/analyse-journal.mjs journal_production.log
```

## Tests de l'inscription

```bash
npm test
```

Les tests couvrent l'âge, la clôture, le délai de 5 secondes du service d'identité, et des inscriptions envoyées en même temps.

## Lancer l'API

```bash
npm run start:dev
```

`POST /api/inscriptions` reçoit :

```json
{ "npi": "3076016910", "dateNaissance": "1991-06-20", "concours": "DOUANES", "centre": "P" }
```

L'âge est décidé au 31 décembre de l'année du concours. La clôture stockée en UTC est comparée à l'instant réel : le Trésor ferme le 20 novembre à 23 h 59, heure du Bénin. L'appel au service d'identité est abandonné au bout de 5 secondes et l'inscription est alors « en attente de vérification ». Le doublon, la capacité et le numéro de table sont décidés dans une seule transaction.

`IDENTITE_URL` pointe vers le service d'identité. Par défaut : `http://localhost:4000`.

## Reprise des données

Le script s'applique à l'export, puis une seconde fois sans rien modifier. Il renumérote les numéros de table en double, retire les inscriptions en double hors Lokossa, puis pose les index d'unicité. Lokossa n'est pas réduite : la liste et la décision sont dans `sql/LOKOSSA.md`.

```bash
node scripts/appliquer-reparation.mjs base_inscriptions.sql
```

## Documents

- `INTERVENTION.md` : ordre de traitement des incidents
- `CAUSES.md` : causes racines et liens
- `RAPPORT_INC-206.md` : rapport de la panne du 19 novembre 2026
- `sql/LOKOSSA.md` : les 7 inscriptions au-dessus de la capacité, et qui prévenir
