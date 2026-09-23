export type JourDisponibilite = { id: string; label: string; abrege: string };
export type CreneauDisponibilite = { id: "matin" | "apres_midi"; label: string };

export const JOURS_SEMAINE: JourDisponibilite[] = [
  { id: "lundi", label: "Lundi", abrege: "Lun" },
  { id: "mardi", label: "Mardi", abrege: "Mar" },
  { id: "mercredi", label: "Mercredi", abrege: "Mer" },
  { id: "jeudi", label: "Jeudi", abrege: "Jeu" },
  { id: "vendredi", label: "Vendredi", abrege: "Ven" },
  { id: "samedi", label: "Samedi", abrege: "Sam" },
  { id: "dimanche", label: "Dimanche", abrege: "Dim" },
];

export const CRENEAUX: CreneauDisponibilite[] = [
  { id: "matin", label: "Matin" },
  { id: "apres_midi", label: "Après-midi" },
];

export function cleCreneau(jourId: string, creneauId: string): string {
  return `${jourId}_${creneauId}`;
}

const IDS_CONNUS = new Set(JOURS_SEMAINE.flatMap((j) => CRENEAUX.map((c) => cleCreneau(j.id, c.id))));

/** Filtre une liste de clés en ne gardant que celles correspondant à un jour/créneau réel. */
export function disponibilitesValides(cles: string[]): string[] {
  return cles.filter((c) => IDS_CONNUS.has(c));
}

/** Résumé lisible et compact des disponibilités, en regroupant les jours consécutifs identiques. */
export function resumeDisponibilites(selection: string[]): string {
  const parJour = JOURS_SEMAINE.map((jour) => ({
    jour,
    matin: selection.includes(cleCreneau(jour.id, "matin")),
    apresMidi: selection.includes(cleCreneau(jour.id, "apres_midi")),
  }));

  if (parJour.every((j) => !j.matin && !j.apresMidi)) return "Aucune disponibilité renseignée";

  type Groupe = { debut: string; fin: string; matin: boolean; apresMidi: boolean };
  const groupes: Groupe[] = [];
  for (const j of parJour) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.matin === j.matin && dernier.apresMidi === j.apresMidi) {
      dernier.fin = j.jour.abrege;
    } else {
      groupes.push({ debut: j.jour.abrege, fin: j.jour.abrege, matin: j.matin, apresMidi: j.apresMidi });
    }
  }

  return groupes
    .filter((g) => g.matin || g.apresMidi)
    .map((g) => {
      const periode = g.debut === g.fin ? g.debut : `${g.debut}-${g.fin}`;
      const creneaux = [g.matin && "matin", g.apresMidi && "après-midi"].filter(Boolean).join(" et ");
      return `${periode} : ${creneaux}`;
    })
    .join(", ");
}
