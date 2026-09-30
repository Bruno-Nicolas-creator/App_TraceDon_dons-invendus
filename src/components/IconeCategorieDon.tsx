import { GROUPES_CATEGORIES_DON } from "@/lib/categoriesDon";

const GROUPE_PAR_CATEGORIE: Record<string, string> = Object.fromEntries(
  GROUPES_CATEGORIES_DON.flatMap((g) => g.categories.map((c) => [c.id, g.id]))
);

const COULEURS_PAR_GROUPE: Record<string, { fond: string; fondActif: string }> = {
  frais: { fond: "#E3F0FA", fondActif: "#C4E2F5" },
  fruits_legumes_boulangerie: { fond: "#E9F6E4", fondActif: "#CFEDC4" },
  epicerie_boissons: { fond: "#FBEEDA", fondActif: "#F6DBAE" },
  non_alimentaire: { fond: "#EEE9FA", fondActif: "#DBCFF3" },
};

const EMOJI_PAR_CATEGORIE: Record<string, string> = {
  viande_poisson: "🥩",
  cremerie: "🧀",
  plats_cuisines: "🍱",
  sandwich: "🥪",
  oeufs: "🥚",
  surgeles: "🧊",
  legumes: "🥬",
  fruits: "🍎",
  pain: "🍞",
  viennoiseries: "🥐",
  feculents: "🍚",
  produits_sucres: "🍬",
  condiments: "🧂",
  conserves: "🥫",
  boissons: "🥤",
  eau: "💧",
  hygiene: "🧴",
  animaux: "🐾",
  autres: "📦",
};

export default function IconeCategorieDon({ id, active = false }: { id: string; active?: boolean }) {
  const couleurs = COULEURS_PAR_GROUPE[GROUPE_PAR_CATEGORIE[id]] ?? COULEURS_PAR_GROUPE.frais;
  return (
    <span
      aria-hidden="true"
      className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full text-lg leading-none"
      style={{ backgroundColor: active ? couleurs.fondActif : couleurs.fond }}
    >
      {EMOJI_PAR_CATEGORIE[id] ?? "🛒"}
    </span>
  );
}
