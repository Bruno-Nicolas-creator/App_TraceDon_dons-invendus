export const NATURES_ACTIVITE_ENTREPRISE = [
  {
    id: "ALIMENTAIRE",
    label: "Alimentaire uniquement",
    exemple: "Ex. épicerie de quartier, boulangerie, restaurant",
  },
  {
    id: "ALIMENTAIRE_ET_NON_ALIMENTAIRE",
    label: "Alimentaire et non alimentaire",
    exemple: "Ex. supermarché, hypermarché avec rayons non alimentaires",
  },
  {
    id: "NON_ALIMENTAIRE",
    label: "Non alimentaire uniquement",
    exemple: "Ex. entreprise de matériel, textile, high-tech, ameublement",
  },
] as const;

export type NatureActiviteEntrepriseId = (typeof NATURES_ACTIVITE_ENTREPRISE)[number]["id"];

export function natureActiviteValide(valeur: string): valeur is NatureActiviteEntrepriseId {
  return NATURES_ACTIVITE_ENTREPRISE.some((n) => n.id === valeur);
}

export function libelleNatureActivite(id: string): string {
  return NATURES_ACTIVITE_ENTREPRISE.find((n) => n.id === id)?.label ?? id;
}

export function peutDonnerAlimentaire(natureActivite: string): boolean {
  return natureActivite === "ALIMENTAIRE" || natureActivite === "ALIMENTAIRE_ET_NON_ALIMENTAIRE";
}

export function peutDonnerMateriel(natureActivite: string): boolean {
  return natureActivite === "NON_ALIMENTAIRE" || natureActivite === "ALIMENTAIRE_ET_NON_ALIMENTAIRE";
}
