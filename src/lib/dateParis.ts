/**
 * Dates à l'heure de Paris. Le serveur Vercel tourne en temps universel (UTC) : sans ces fonctions,
 * « aujourd'hui », un début de mois ou un « jusqu'au 31 inclus » sont décalés d'une à deux heures
 * (un congé saisi jusqu'au 31 finissait le 1er à 1 h 59, un planning du lundi démarrait à 1 h…).
 */

export const FUSEAU = "Europe/Paris";

const formateur = new Intl.DateTimeFormat("en-GB", {
  timeZone: FUSEAU,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
  weekday: "short",
});

const JOURS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Année, mois (0 = janvier), jour, jour de la semaine (0 = lundi) d'un instant, vus de Paris. */
export function partiesParis(date: Date = new Date()) {
  const p = Object.fromEntries(formateur.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    annee: Number(p.year),
    mois: Number(p.month) - 1,
    jour: Number(p.day),
    heure: Number(p.hour),
    minute: Number(p.minute),
    seconde: Number(p.second),
    jourSemaine: JOURS.indexOf(p.weekday),
  };
}

/** Écart entre l'heure de Paris et UTC à un instant donné (en ms : +1 h en hiver, +2 h en été). */
function decalage(instant: number): number {
  const p = partiesParis(new Date(instant));
  return Date.UTC(p.annee, p.mois, p.jour, p.heure, p.minute, p.seconde) - Math.floor(instant / 1000) * 1000;
}

/** Instant correspondant à une date et une heure « murales » de Paris (mois : 0 = janvier, débordements acceptés). */
export function instantParis(annee: number, mois: number, jour: number, heure = 0, minute = 0, seconde = 0, ms = 0): Date {
  const mural = Date.UTC(annee, mois, jour, heure, minute, seconde, ms);
  let instant = mural - decalage(mural);
  instant = mural - decalage(instant); // second passage : changement d'heure entre les deux estimations
  return new Date(instant);
}

/** « 2026-10-31 » (champ date d'un formulaire) → minuit à Paris ce jour-là ; null si invalide. */
export function debutJourParis(saisie: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(saisie);
  if (!m) return null;
  return instantParis(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** « 2026-10-31 » → 23 h 59 min 59,999 s à Paris ce jour-là (borne de fin incluse) ; null si invalide. */
export function finJourParis(saisie: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(saisie);
  if (!m) return null;
  return instantParis(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
}

/** Premier jour du mois à minuit, heure de Paris, `decalageMois` mois avant/après le mois en cours. */
export function debutMoisParis(decalageMois = 0, depuis: Date = new Date()): Date {
  const p = partiesParis(depuis);
  return instantParis(p.annee, p.mois + decalageMois, 1);
}
