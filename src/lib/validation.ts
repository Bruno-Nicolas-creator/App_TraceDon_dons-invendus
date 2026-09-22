export function siretValide(siret: string): boolean {
  return /^\d{14}$/.test(siret);
}

export function rnaValide(rna: string): boolean {
  return /^W\d{9}$/i.test(rna);
}

export const LONGUEUR_MAX_CHAMP_COURT = 200;
export const LONGUEUR_MAX_ADRESSE = 300;

/** Vrai si un champ texte libre dépasse une longueur raisonnable (garde-fou anti-abus). */
export function champTropLong(valeur: string, max: number = LONGUEUR_MAX_CHAMP_COURT): boolean {
  return valeur.length > max;
}
