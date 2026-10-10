import { partiesParis } from "@/lib/dateParis";

export const LIBELLES_JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

// Jour de la semaine à Paris (0 = lundi ... 6 = dimanche) : le serveur tourne en UTC, un lundi
// à 0 h 30 à Paris y est encore dimanche.
export function jourSemaineDuJour(date: Date): number {
  return partiesParis(date).jourSemaine;
}
