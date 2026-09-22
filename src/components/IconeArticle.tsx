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

function Trace({ categorie, stroke }: { categorie: CategorieArticle; stroke: string }) {
  switch (categorie) {
    case "pain":
      return (
        <>
          <path
            d="M4 14C4 10.5 7.2 7.5 12 7.5C16.8 7.5 20 10.5 20 14C20 17 16.8 18 12 18C7.2 18 4 17 4 14Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9 9.5L8 12.5M12.5 8.5L11.5 12.5M16 9.5L15 12.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "fruit":
      return (
        <>
          <path
            d="M12 9C9 9 6.8 11.2 6.8 14.3C6.8 17.5 9 20 12 20C15 20 17.2 17.5 17.2 14.3C17.2 11.2 15 9 12 9Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M12 9C12 7 12.6 5.6 14 5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M12 7.3C12.8 6.2 14.3 5.9 15.2 6.8" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
    case "legume":
      return (
        <>
          <path
            d="M9.5 4.5C13 5.5 15.5 8.5 14.7 12.5C14 16 10.8 20 9 20C7.4 20 6.5 17.6 6.5 14.8C6.5 10.8 8 6.8 9.5 4.5Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9.5 4.5L8 2.3M9.5 4.5L9.7 2M9.5 4.5L11.3 2.7" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
    case "laitier":
      return (
        <>
          <path d="M9 9L9 5.5L12 3L15 5.5V9" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path
            d="M8 9H16V19.3C16 19.7 15.7 20 15.3 20H8.7C8.3 20 8 19.7 8 19.3V9Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </>
      );
    case "viande":
      return (
        <path
          d="M13.8 4.2C16.6 4.2 18.6 6.6 17.8 9.4C17.1 11.7 14.7 12.7 12.9 13.2L9.6 16.8C8.7 17.8 7.2 17.9 6.3 17C5.4 16.1 5.5 14.6 6.4 13.7L9.7 10.1C9.2 8.3 10.1 5.7 12.4 4.6C12.9 4.4 13.4 4.2 13.8 4.2Z"
          stroke={stroke}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "boisson":
      return (
        <>
          <path
            d="M8 8H16L15.2 19C15.1 19.6 14.6 20 14 20H10C9.4 20 8.9 19.6 8.8 19L8 8Z"
            stroke={stroke}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M8.6 11.5H15.4" stroke={stroke} strokeWidth="1.3" />
          <path d="M14.2 8L15.8 3.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "surgele":
      return (
        <path
          d="M12 3V21M4.9 7.5L19.1 16.5M19.1 7.5L4.9 16.5M12 3L10.3 5.3M12 3L13.7 5.3M12 21L10.3 18.7M12 21L13.7 18.7"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );
    case "epicerie":
      return (
        <>
          <rect x="7.5" y="5" width="9" height="3" rx="1" stroke={stroke} strokeWidth="1.5" />
          <rect x="6.5" y="8" width="11" height="12" rx="1.5" stroke={stroke} strokeWidth="1.6" />
        </>
      );
    default:
      return <path d="M4 7L12 3L20 7V17L12 21L4 17V7Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />;
  }
}

export default function IconeArticle({ designation, stroke = "#6B6459" }: { designation: string; stroke?: string }) {
  const categorie = categoriserArticle(designation);
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <Trace categorie={categorie} stroke={stroke} />
    </svg>
  );
}
