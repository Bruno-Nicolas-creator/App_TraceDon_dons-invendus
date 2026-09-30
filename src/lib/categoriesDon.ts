export type CategorieDon = { id: string; label: string };
export type GroupeCategorieDon = { id: string; label: string; categories: CategorieDon[] };

export const GROUPES_CATEGORIES_DON: GroupeCategorieDon[] = [
  {
    id: "frais",
    label: "Frais & Plats préparés",
    categories: [
      { id: "viande_poisson", label: "Viande / poisson frais" },
      { id: "cremerie", label: "Crèmerie" },
      { id: "plats_cuisines", label: "Plats cuisinés" },
      { id: "sandwich", label: "Sandwich" },
      { id: "oeufs", label: "Œufs" },
      { id: "surgeles", label: "Surgelés" },
    ],
  },
  {
    id: "fruits_legumes_boulangerie",
    label: "Fruits, Légumes & Boulangerie",
    categories: [
      { id: "legumes", label: "Légumes" },
      { id: "fruits", label: "Fruits" },
      { id: "pain", label: "Pain" },
      { id: "viennoiseries", label: "Viennoiseries" },
    ],
  },
  {
    id: "epicerie_boissons",
    label: "Épicerie & Boissons",
    categories: [
      { id: "feculents", label: "Féculents" },
      { id: "produits_sucres", label: "Produits sucrés" },
      { id: "condiments", label: "Condiments" },
      { id: "conserves", label: "Conserves / produits salés" },
      { id: "boissons", label: "Boissons diverses" },
      { id: "eau", label: "Eau" },
    ],
  },
  {
    id: "non_alimentaire",
    label: "Non-alimentaire & Divers",
    categories: [
      { id: "hygiene", label: "Hygiène & soin" },
      { id: "animaux", label: "Alimentation animaux" },
      { id: "autres", label: "Autres produits non alimentaires" },
    ],
  },
];

export const TOUTES_CATEGORIES_DON: CategorieDon[] = GROUPES_CATEGORIES_DON.flatMap((g) => g.categories);

export function libelleCategorieDon(id: string): string {
  return TOUTES_CATEGORIES_DON.find((c) => c.id === id)?.label ?? id;
}

const CATEGORIES_NON_ALIMENTAIRES = new Set(
  GROUPES_CATEGORIES_DON.find((g) => g.id === "non_alimentaire")?.categories.map((c) => c.id) ?? []
);

/** Un article de cette catégorie n'a pas d'empreinte carbone alimentaire (ex. hygiène, matériel). */
export function categorieEstNonAlimentaire(id: string | null): boolean {
  return id != null && CATEGORIES_NON_ALIMENTAIRES.has(id);
}
