/** "à l'instant" / "il y a 3h" / "hier" / "il y a 5 j" — utilisé partout où l'ancienneté d'une
 * publication doit être affichée (dons sans association, dons disponibles...). */
export function formatDepuis(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const heures = Math.floor(diffMs / 3_600_000);
  if (heures < 1) return "à l'instant";
  if (heures < 24) return `il y a ${heures}h`;
  const jours = Math.floor(heures / 24);
  return jours === 1 ? "hier" : `il y a ${jours} j`;
}
