export const LIBELLES_JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

// Convertit le getDay() natif de JS (0 = dimanche) vers notre index (0 = lundi ... 6 = dimanche).
export function jourSemaineDuJour(date: Date): number {
  return (date.getDay() + 6) % 7;
}
