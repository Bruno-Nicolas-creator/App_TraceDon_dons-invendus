const BASE_URL = "https://impactco2.fr/api/v1";

export function isImpactCo2Configured(): boolean {
  return Boolean(process.env.IMPACT_CO2_API_KEY);
}

// Catégories de dons alimentaires réalistes pour ce type de plateforme
// (viande et poisson frais sont rarement donnés, contraintes sanitaires /
// chaîne du froid). La moyenne est recalculée à partir des données ADEME/
// Agribalyse (une moyenne par catégorie, puis moyenne de ces moyennes),
// et mise en cache 24h en mémoire.
const CATEGORIES_DONS_ALIMENTAIRES = ["plats", "encas", "laitier", "fruits", "cereales", "vegetariens"];
const DUREE_CACHE_MS = 24 * 60 * 60 * 1000;

let cacheFacteurAlimentation: { valeur: number; expiration: number } | null = null;
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

export async function calculerImpactCarbone(poidsKg: number): Promise<ImpactCarbone | null> {
  if (poidsKg <= 0) return null;
  const facteurAlimentation = await obtenirFacteurAlimentationParKg();
  if (facteurAlimentation == null) return null;

  const co2EviteKg = poidsKg * facteurAlimentation;
  const facteurVoiture = await obtenirFacteurVoitureParKm();
  const equivalenceKm = facteurVoiture ? co2EviteKg / facteurVoiture : null;

  return { co2EviteKg, equivalenceKm };
}
