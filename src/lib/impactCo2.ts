import { categorieEstNonAlimentaire } from "@/lib/categoriesDon";

const BASE_URL = "https://impactco2.fr/api/v1";

export function isImpactCo2Configured(): boolean {
  return Boolean(process.env.IMPACT_CO2_API_KEY);
}

// Catégories de dons alimentaires réalistes pour ce type de plateforme
// (viande et poisson frais sont rarement donnés, contraintes sanitaires /
// chaîne du froid). Sert de facteur de secours quand la catégorie précise
// de l'article n'a pas de rayon équivalent ci-dessous (cf. RAYON_PAR_CATEGORIE).
const CATEGORIES_DONS_ALIMENTAIRES = ["plats", "encas", "laitier", "fruits", "cereales", "vegetariens"];

// Nos catégories de dons (src/lib/categoriesDon.ts) mises en correspondance avec les rayons de
// l'API Impact CO2 (données ADEME/Agribalyse, cf. /alimentation?category=rayon), pour un facteur
// CO2/kg par catégorie plutôt qu'une moyenne unique pour tout type de produit. Les catégories
// absentes d'ici (ex. boissons, eau, surgelés) retombent sur la moyenne de secours ci-dessus.
// `items`, quand présent, isole les produits du rayon pertinents pour la catégorie (ex. un rayon
// « Boulangerie » mélange pain et viennoiseries dans l'API — sans ce filtre, le facteur du pain
// serait gonflé par les croissants et pains au chocolat).
type CorrespondanceRayon = { rayons: string[]; items?: string[] };
const RAYON_PAR_CATEGORIE: Record<string, CorrespondanceRayon> = {
  viande_poisson: { rayons: ["boucherie", "poissonnerie"] },
  cremerie: { rayons: ["fromagerie"] },
  plats_cuisines: { rayons: ["traiteur"] },
  sandwich: { rayons: ["traiteur"] },
  oeufs: { rayons: ["epiceriesalee"], items: ["oeuf"] },
  legumes: { rayons: ["fruits"], items: ["carotte", "courgette", "tomate", "potiron", "laitue", "poireau", "pommedeterre"] },
  fruits: { rayons: ["fruits"], items: ["pomme", "banane", "mangue", "avocat"] },
  pain: { rayons: ["boulangerie"], items: ["baguette", "paindemie"] },
  viennoiseries: { rayons: ["boulangerie"], items: ["painauchocolat", "croissant", "chaussonauxpommes", "painauxraisins"] },
  feculents: { rayons: ["epiceriesalee"], items: ["riz", "pates", "ble", "boulgour", "frites", "poischiches", "lentilles", "haricotsrouges", "mais", "tofu"] },
  produits_sucres: { rayons: ["epiceriesucree"] },
  conserves: { rayons: ["epiceriesalee"], items: ["mais", "lentilles", "poischiches", "haricotsrouges"] },
};

const DUREE_CACHE_MS = 24 * 60 * 60 * 1000;

let cacheFacteurAlimentation: { valeur: number; expiration: number } | null = null;
let cacheFacteursParRayon: { valeur: Map<string, { slug: string; ecv: number }[]>; expiration: number } | null = null;
let cacheFacteurVoiture: { valeur: number; expiration: number } | null = null;

async function appelApi<T>(chemin: string): Promise<T | null> {
  const cle = process.env.IMPACT_CO2_API_KEY;
  if (!cle) return null;
  const reponse = await fetch(`${BASE_URL}${chemin}`, {
    headers: { Authorization: cle },
    cache: "no-store",
  }).catch(() => null);
  if (!reponse || !reponse.ok) return null;
  return reponse.json().catch(() => null);
}

async function obtenirFacteurAlimentationParKg(): Promise<number | null> {
  if (cacheFacteurAlimentation && cacheFacteurAlimentation.expiration > Date.now()) {
    return cacheFacteurAlimentation.valeur;
  }

  const donnees = await appelApi<{ data: { slug: string; items: { ecv: number }[] }[] }>(
    "/alimentation?category=group"
  );
  const groupes = donnees?.data ?? [];

  const moyennesParGroupe = groupes
    .filter((g) => CATEGORIES_DONS_ALIMENTAIRES.includes(g.slug) && g.items.length > 0)
    .map((g) => g.items.reduce((somme, item) => somme + item.ecv, 0) / g.items.length);

  if (moyennesParGroupe.length === 0) return null;

  const valeur = moyennesParGroupe.reduce((somme, v) => somme + v, 0) / moyennesParGroupe.length;
  cacheFacteurAlimentation = { valeur, expiration: Date.now() + DUREE_CACHE_MS };
  return valeur;
}

async function obtenirFacteursParRayon(): Promise<Map<string, { slug: string; ecv: number }[]> | null> {
  if (cacheFacteursParRayon && cacheFacteursParRayon.expiration > Date.now()) {
    return cacheFacteursParRayon.valeur;
  }

  const donnees = await appelApi<{ data: { slug: string; items: { slug: string; ecv: number }[] }[] }>(
    "/alimentation?category=rayon"
  );
  const rayons = donnees?.data ?? [];
  if (rayons.length === 0) return null;

  const valeur = new Map(rayons.filter((r) => r.items.length > 0).map((r) => [r.slug, r.items] as const));
  cacheFacteursParRayon = { valeur, expiration: Date.now() + DUREE_CACHE_MS };
  return valeur;
}

/** Facteur CO2/kg le plus précis pour une catégorie de don donnée, ou null si aucun rayon ne correspond. */
function facteurPourCategorie(
  categorie: string | null,
  facteursParRayon: Map<string, { slug: string; ecv: number }[]>
): number | null {
  if (!categorie) return null;
  const correspondance = RAYON_PAR_CATEGORIE[categorie];
  if (!correspondance) return null;

  const items = correspondance.rayons
    .flatMap((slug) => facteursParRayon.get(slug) ?? [])
    .filter((item) => !correspondance.items || correspondance.items.includes(item.slug));
  if (items.length === 0) return null;

  return items.reduce((somme, item) => somme + item.ecv, 0) / items.length;
}

async function obtenirFacteurVoitureParKm(): Promise<number | null> {
  if (cacheFacteurVoiture && cacheFacteurVoiture.expiration > Date.now()) {
    return cacheFacteurVoiture.valeur;
  }

  const donnees = await appelApi<{ data: { slug: string; ecv: number }[] }>("/thematiques/ecv/transport");
  const voiture = donnees?.data.find((item) => item.slug === "voiturethermique");
  if (!voiture) return null;

  cacheFacteurVoiture = { valeur: voiture.ecv, expiration: Date.now() + DUREE_CACHE_MS };
  return voiture.ecv;
}

export type ImpactCarbone = {
  co2EviteKg: number;
  equivalenceKm: number | null;
};

export type ArticlePourImpact = { poidsKg: number; categorie: string | null };

/**
 * Calcule le CO2 évité par un lot d'articles : chaque article prend le facteur
 * CO2/kg de son propre rayon (cf. RAYON_PAR_CATEGORIE) plutôt qu'une moyenne unique pour tout
 * le lot — plus juste dès qu'un don mélange des produits très différents (viande et légumes,
 * par exemple). Les articles non alimentaires (hygiène, matériel...) ne comptent pas : cette
 * mesure ne porte que sur le gaspillage alimentaire évité.
 */
export async function calculerImpactCarboneDetaille(articles: ArticlePourImpact[]): Promise<ImpactCarbone | null> {
  const articlesAlimentaires = articles.filter((a) => a.poidsKg > 0 && !categorieEstNonAlimentaire(a.categorie));
  if (articlesAlimentaires.length === 0) return null;

  const [facteursParRayon, facteurSecours] = await Promise.all([
    obtenirFacteursParRayon(),
    obtenirFacteurAlimentationParKg(),
  ]);
  if (!facteursParRayon && facteurSecours == null) return null;

  const co2EviteKg = articlesAlimentaires.reduce((somme, a) => {
    const facteur = (facteursParRayon && facteurPourCategorie(a.categorie, facteursParRayon)) ?? facteurSecours;
    return facteur != null ? somme + a.poidsKg * facteur : somme;
  }, 0);

  const facteurVoiture = await obtenirFacteurVoitureParKm();
  const equivalenceKm = facteurVoiture ? co2EviteKg / facteurVoiture : null;

  return { co2EviteKg, equivalenceKm };
}
