export type RoleBenevole = "REFERENT" | "COLLECTEUR";

export const LABEL_ROLE_BENEVOLE: Record<RoleBenevole, string> = {
  REFERENT: "Référent don",
  COLLECTEUR: "Collecteur",
};

export function roleBenevoleValide(valeur: string): valeur is RoleBenevole {
  return valeur === "REFERENT" || valeur === "COLLECTEUR";
}
