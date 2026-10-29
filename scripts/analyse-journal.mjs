import fs from 'fs';

const ANNEE_CONCOURS = 2026;
const CLOTURE_TRESOR = new Date('2026-11-20T22:59:00.000Z');
const SEUIL_IDENTITE_MS = 5000;

const NOMS_CENTRES = {
  C: 'Cotonou',
  P: 'Parakou',
  L: 'Lokossa',
  N: 'Porto-Novo',
  A: 'Abomey',
};

const chemin = process.argv[2];
if (!chemin) {
  console.error('Usage : node scripts/analyse-journal.mjs <journal>');
  process.exit(1);
}

const contenu = fs.readFileSync(chemin, 'utf8');
const lignes = contenu.split(/\r?\n/).filter((ligne) => ligne.length > 0);

const creations = [];
const lentes = [];
const refusClotureTresor = [];
const refusAge = [];
const listes = new Map();

for (const ligne of lignes) {
  const evenement = lireEvenement(ligne);
  if (!evenement) {
    console.error(`Ligne illisible : ${ligne}`);
    process.exit(1);
  }

  const { date, rest } = evenement;

  if (rest.startsWith('appel identite')) {
    const duree = dureeMs(rest);
    if (duree >= SEUIL_IDENTITE_MS) {
      lentes.push({ date, duree, requete: evenement.requete });
    }
    continue;
  }

  if (rest.includes('POST /api/inscriptions') && statut(rest) === 201) {
    creations.push({
      date,
      npi: champ(rest, 'npi'),
      concours: champ(rest, 'concours'),
      centre: champ(rest, 'centre'),
      numero: champ(rest, 'numero'),
    });
    continue;
  }

  if (rest.includes('POST /api/inscriptions') && erreur(rest)?.startsWith('Inscriptions closes') && champ(rest, 'concours') === 'TRESOR') {
    refusClotureTresor.push({ date, npi: champ(rest, 'npi'), centre: champ(rest, 'centre') });
    continue;
  }

  if (rest.includes('POST /api/inscriptions') && erreur(rest)?.includes('Âge limite')) {
    refusAge.push({
      date,
      npi: champ(rest, 'npi'),
      concours: champ(rest, 'concours'),
      naissance: champ(rest, 'naissance'),
    });
    continue;
  }

  const centreListe = rest.match(/GET \/api\/centres\/([CPLNA])\/inscrits/);
  if (centreListe) {
    const code = centreListe[1];
    if (!listes.has(code)) listes.set(code, []);
    listes.get(code).push(dureeMs(rest));
  }
}

const numerosEnDouble = grouper(creations, (creation) => creation.numero).filter((groupe) => groupe.elements.length > 1);
const inscriptionsEnDouble = grouper(creations, (creation) => `${creation.npi}|${creation.concours}`).filter((groupe) => groupe.elements.length > 1);

lentes.sort((a, b) => a.date - b.date);
const refusATort = refusClotureTresor.filter((refus) => refus.date <= CLOTURE_TRESOR);
const agesATort = refusAge.filter((refus) => ageAu31Decembre(refus.naissance, ANNEE_CONCOURS) <= 35);

console.log(`Journal : ${chemin}`);
console.log(`${lignes.length} événements. Heures affichées à l'heure du Bénin (UTC+1).`);
console.log('');

console.log('Numéros de table attribués plusieurs fois');
if (numerosEnDouble.length === 0) {
  console.log('Aucun.');
} else {
  console.log(`${numerosEnDouble.length} numéros.`);
  for (const groupe of numerosEnDouble) {
    console.log(`${groupe.cle} — ${groupe.elements.length} attributions`);
    for (const creation of groupe.elements) {
      console.log(`  ${heureBenin(creation.date)}  ${creation.concours}  centre ${creation.centre}  npi ${creation.npi}`);
    }
  }
}
console.log('');

console.log('Inscriptions en double');
if (inscriptionsEnDouble.length === 0) {
  console.log('Aucune.');
} else {
  console.log(`${inscriptionsEnDouble.length} inscriptions.`);
  for (const groupe of inscriptionsEnDouble) {
    const [npi, concours] = groupe.cle.split('|');
    console.log(`npi ${npi}  concours ${concours} — ${groupe.elements.length} enregistrements`);
    for (const creation of groupe.elements) {
      console.log(`  ${heureBenin(creation.date)}  centre ${creation.centre}  numéro ${creation.numero}`);
    }
  }
}
console.log('');

console.log("Service d'identification à 5 secondes ou plus");
if (lentes.length === 0) {
  console.log('Aucun appel.');
} else {
  console.log(`Du ${heureBenin(lentes[0].date)} au ${heureBenin(lentes[lentes.length - 1].date)}.`);
  console.log(`Requêtes touchées : ${lentes.length}.`);
}
console.log('');

console.log('Refus à tort le soir de la clôture du Trésor');
console.log(`La clôture est le 20 novembre 2026 à 23:59, heure du Bénin.`);
console.log(`Refus « Inscriptions closes » du Trésor à cette heure ou avant : ${refusATort.length}.`);
console.log('');

console.log("Candidats refusés à tort pour l'âge");
console.log(`Règle attendue : 35 ans au plus au 31 décembre ${ANNEE_CONCOURS}.`);
console.log(`${agesATort.length} candidats.`);
for (const refus of agesATort) {
  const age = ageAu31Decembre(refus.naissance, ANNEE_CONCOURS);
  console.log(`  ${heureBenin(refus.date)}  npi ${refus.npi}  naissance ${refus.naissance}  âge ${age}  ${refus.concours}`);
}
console.log('');

console.log('Liste des inscrits par centre');
for (const [code, nom] of Object.entries(NOMS_CENTRES)) {
  const durees = listes.get(code) ?? [];
  if (durees.length === 0) {
    console.log(`${nom} (${code}) : aucun appel.`);
    continue;
  }
  const somme = durees.reduce((total, duree) => total + duree, 0);
  const moyenne = somme / durees.length;
  const maximum = Math.max(...durees);
  console.log(`${nom} (${code}) : ${durees.length} appels, moyenne ${formaterMs(moyenne)}, maximum ${formaterMs(maximum)}.`);
}

function lireEvenement(ligne) {
  const correspondance = ligne.match(/^(\S+) (\w+)\s+\[req:([0-9a-f]+)\] (.*)$/);
  if (!correspondance) return null;
  return {
    date: new Date(correspondance[1]),
    niveau: correspondance[2],
    requete: correspondance[3],
    rest: correspondance[4],
  };
}

function champ(rest, nom) {
  const correspondance = rest.match(new RegExp(`${nom}=(\\S+)`));
  return correspondance ? correspondance[1] : null;
}

function erreur(rest) {
  const correspondance = rest.match(/erreur="([^"]*)"/);
  return correspondance ? correspondance[1] : null;
}

function statut(rest) {
  const correspondance = rest.match(/-> (\d+)/);
  return correspondance ? Number(correspondance[1]) : null;
}

function dureeMs(rest) {
  const correspondance = rest.match(/\((\d+) ms\)/);
  return correspondance ? Number(correspondance[1]) : 0;
}

function ageAu31Decembre(naissance, annee) {
  const [anneeNaissance, mois, jour] = naissance.split('-').map(Number);
  const anniversaireDejaPasse = mois < 12 || (mois === 12 && jour <= 31);
  return annee - anneeNaissance - (anniversaireDejaPasse ? 0 : 1);
}

function heureBenin(date) {
  const locale = new Date(date.getTime() + 60 * 60 * 1000);
  const annee = locale.getUTCFullYear();
  const mois = deuxChiffres(locale.getUTCMonth() + 1);
  const jour = deuxChiffres(locale.getUTCDate());
  const heure = deuxChiffres(locale.getUTCHours());
  const minute = deuxChiffres(locale.getUTCMinutes());
  const seconde = deuxChiffres(locale.getUTCSeconds());
  return `${annee}-${mois}-${jour} ${heure}:${minute}:${seconde}`;
}

function deuxChiffres(valeur) {
  return String(valeur).padStart(2, '0');
}

function formaterMs(valeur) {
  return `${Math.round(valeur)} ms`;
}

function grouper(elements, cleDe) {
  const groupes = new Map();
  for (const element of elements) {
    const cle = cleDe(element);
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(element);
  }
  return [...groupes.entries()].map(([cle, contenu]) => ({ cle, elements: contenu }));
}
