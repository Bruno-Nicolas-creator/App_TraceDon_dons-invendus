const UNITES = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const DIZAINES = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

function centainesEnLettres(n: number): string {
  if (n === 0) return "";
  if (n < 20) return UNITES[n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (d === 7 || d === 9) {
      const base = DIZAINES[d - 1];
      return u === 0 ? `${base}-dix` : u === 1 && d === 7 ? `${base}-et-onze` : `${base}-${UNITES[10 + u]}`;
    }
    const trait = u === 1 && d !== 8 ? "-et-" : "-";
    if (u === 0) return d === 8 ? "quatre-vingts" : DIZAINES[d];
    return `${DIZAINES[d]}${trait}${UNITES[u]}`;
  }
  const c = Math.floor(n / 100);
  const reste = n % 100;
  const centaine = c === 1 ? "cent" : `${UNITES[c]}-cent`;
  if (reste === 0) return c > 1 ? `${centaine}s` : centaine;
  return `${centaine}-${centainesEnLettres(reste)}`;
}

function entierEnLettres(n: number): string {
  if (n === 0) return "zéro";
  const milliards = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1_000);
  const reste = n % 1_000;

  const parties: string[] = [];
  if (milliards > 0) parties.push(`${milliards === 1 ? "un" : centainesEnLettres(milliards)} milliard${milliards > 1 ? "s" : ""}`);
  if (millions > 0) parties.push(`${millions === 1 ? "un" : centainesEnLettres(millions)} million${millions > 1 ? "s" : ""}`);
  if (milliers > 0) parties.push(milliers === 1 ? "mille" : `${centainesEnLettres(milliers)} mille`);
  if (reste > 0) parties.push(centainesEnLettres(reste));

  return parties.join(" ");
}

/** Ex: 842.5 -> "huit cent quarante-deux euros et cinquante centimes" */
export function montantEnLettres(montant: number): string {
  const euros = Math.floor(montant);
  const centimes = Math.round((montant - euros) * 100);

  const partieEuros = `${entierEnLettres(euros)} euro${euros > 1 ? "s" : ""}`;
  if (centimes === 0) return partieEuros;

  return `${partieEuros} et ${entierEnLettres(centimes)} centime${centimes > 1 ? "s" : ""}`;
}
