import { GROUPES_CATEGORIES_DON } from "@/lib/categoriesDon";

/**
 * Familles de dons qu'une association peut suivre pour ses alertes « nouveau don » : les quatre
 * groupes de catégories des dons alimentaires, plus le matériel. Aucune famille cochée = toutes.
 */
export const FAMILLES_ALERTE: { id: string; label: string }[] = [
  ...GROUPES_CATEGORIES_DON.map((g) => ({ id: g.id, label: g.label })),
  { id: "materiel", label: "Matériel (mobilier, équipement…)" },
];

export const IDS_FAMILLES_ALERTE = new Set(FAMILLES_ALERTE.map((f) => f.id));

export const RAYONS_ALERTE_KM = [5, 10, 15, 25, 50] as const;

/** Familles auxquelles appartient un don (un don alimentaire sans catégorie relève de toutes les familles alimentaires). */
export function famillesDuDon(don: { type: "ALIMENTAIRE" | "MATERIEL"; categorie: string | null }): string[] {
  if (don.type === "MATERIEL") return ["materiel"];
  const groupe = GROUPES_CATEGORIES_DON.find((g) => g.categories.some((c) => c.id === don.categorie));
  return groupe ? [groupe.id] : GROUPES_CATEGORIES_DON.map((g) => g.id);
}
