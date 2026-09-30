type CategorieArticle = "pain" | "fruit" | "legume" | "laitier" | "viande" | "boisson" | "surgele" | "epicerie" | "autre";

// L'ordre compte : les boissons ("jus d'orange") doivent être détectées avant les fruits
// ("orange"), sans quoi le mot-clé du fruit l'emporterait à tort.
const REGLES: { test: RegExp; categorie: CategorieArticle }[] = [
  { test: /pain|baguette|brioche|croissant|viennoiserie|boulanger/i, categorie: "pain" },
  { test: /jus|eau min|soda|boisson|limonade|sirop/i, categorie: "boisson" },
  { test: /fruit|pomme|banane|orange|poire|fraise|raisin|kiwi|p[êe]che|abricot|melon|mangue|citron|cl[ée]mentine|ananas/i, categorie: "fruit" },
  { test: /l[ée]gume|carotte|tomate|salade|courgette|poivron|oignon|patate|pomme de terre|brocoli|haricot|concombre|chou|poireau|c[ée]leri/i, categorie: "legume" },
  { test: /lait|yaourt|yogourt|fromage|beurre|cr[èe]me|oeuf|œuf/i, categorie: "laitier" },
  { test: /viande|poulet|b[oœ]euf|porc|jambon|saucisse|poisson|saumon|thon|charcuterie|dinde|agneau/i, categorie: "viande" },
  { test: /surgel[ée]|glace/i, categorie: "surgele" },
  { test: /riz|p[âa]tes|conserve|bo[îi]te|[ée]picerie|c[ée]r[ée]ale|farine|sucre|biscuit|g[âa]teau|chocolat|caf[ée]|th[ée]|confiture|huile/i, categorie: "epicerie" },
];

export function categoriserArticle(designation: string): CategorieArticle {
  for (const regle of REGLES) {
    if (regle.test.test(designation)) return regle.categorie;
  }
  return "autre";
}

const EMOJI_PAR_CATEGORIE: Record<CategorieArticle, string> = {
  pain: "🍞",
  fruit: "🍎",
  legume: "🥬",
  laitier: "🥛",
  viande: "🥩",
  boisson: "🥤",
  surgele: "🧊",
  epicerie: "🥫",
  autre: "📦",
};

const FOND_PAR_CATEGORIE: Record<CategorieArticle, string> = {
  pain: "#F6E9D2",
  fruit: "#FBE0DA",
  legume: "#E9F6E4",
  laitier: "#E3F0FA",
  viande: "#FBE0DA",
  boisson: "#E3F0FA",
  surgele: "#E3F0FA",
  epicerie: "#FBEEDA",
  autre: "#EEE9FA",
};

export default function IconeArticle({ designation }: { designation: string }) {
  const categorie = categoriserArticle(designation);
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base leading-none"
      style={{ backgroundColor: FOND_PAR_CATEGORIE[categorie] }}
    >
      {EMOJI_PAR_CATEGORIE[categorie]}
    </span>
  );
}
