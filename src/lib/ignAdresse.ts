export type SuggestionAdresse = {
  adresse: string;
  latitude: number;
  longitude: number;
};

type ResultatApi = {
  fulltext: string;
  kind: string;
  x: number;
  y: number;
};

export async function rechercherAdresses(q: string): Promise<SuggestionAdresse[]> {
  const requete = q.trim();
  if (requete.length < 3) return [];

  const url = new URL("https://data.geopf.fr/geocodage/completion");
  url.searchParams.set("text", requete);
  url.searchParams.set("maximumResponses", "6");

  const reponse = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!reponse || !reponse.ok) return [];

  const donnees = await reponse.json().catch(() => null);
  const resultats: ResultatApi[] = donnees?.results ?? [];

  return resultats
    .filter((r) => r.kind === "housenumber")
    .map((r) => ({ adresse: r.fulltext, latitude: r.y, longitude: r.x }));
}
