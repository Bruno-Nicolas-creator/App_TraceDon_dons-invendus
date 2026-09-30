/**
 * Les 14 allergènes à déclaration obligatoire au sens du règlement européen INCO (UE n°1169/2011,
 * annexe II). Les identifiants Open Food Facts correspondants (préfixe "en:") servent à faire
 * correspondre automatiquement les allergènes déclarés par un produit scanné (cf. openFoodFacts.ts).
 */
export type Allergene = { id: string; label: string; idOpenFoodFacts: string };

export const ALLERGENES: Allergene[] = [
  { id: "gluten", label: "Gluten", idOpenFoodFacts: "en:gluten" },
  { id: "crustaces", label: "Crustacés", idOpenFoodFacts: "en:crustaceans" },
  { id: "oeufs", label: "Œufs", idOpenFoodFacts: "en:eggs" },
  { id: "poisson", label: "Poisson", idOpenFoodFacts: "en:fish" },
  { id: "arachides", label: "Arachides", idOpenFoodFacts: "en:peanuts" },
  { id: "soja", label: "Soja", idOpenFoodFacts: "en:soybeans" },
  { id: "lait", label: "Lait", idOpenFoodFacts: "en:milk" },
  { id: "fruits_a_coque", label: "Fruits à coque", idOpenFoodFacts: "en:nuts" },
  { id: "celeri", label: "Céleri", idOpenFoodFacts: "en:celery" },
  { id: "moutarde", label: "Moutarde", idOpenFoodFacts: "en:mustard" },
  { id: "sesame", label: "Sésame", idOpenFoodFacts: "en:sesame-seeds" },
  { id: "sulfites", label: "Sulfites", idOpenFoodFacts: "en:sulphur-dioxide-and-sulphites" },
  { id: "lupin", label: "Lupin", idOpenFoodFacts: "en:lupin" },
  { id: "mollusques", label: "Mollusques", idOpenFoodFacts: "en:molluscs" },
];

const PAR_ID = new Map(ALLERGENES.map((a) => [a.id, a]));
const PAR_ID_OFF = new Map(ALLERGENES.map((a) => [a.idOpenFoodFacts, a.id]));

export function allergenesValides(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => PAR_ID.has(id)))];
}

export function libelleAllergene(id: string): string {
  return PAR_ID.get(id)?.label ?? id;
}

/** Fait correspondre les tags allergènes renvoyés par Open Food Facts à nos identifiants internes. */
export function allergenesDepuisTagsOpenFoodFacts(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => PAR_ID_OFF.get(tag)).filter((id): id is string => !!id))];
}
