import "server-only";

export type Coordonnees = { lat: number; lng: number };

export function isGoogleMapsServerConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

export async function geocoderAdresse(adresse: string): Promise<Coordonnees | null> {
  const cle = process.env.GOOGLE_MAPS_API_KEY;
  if (!cle) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", adresse);
  url.searchParams.set("key", cle);

  const reponse = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!reponse || !reponse.ok) return null;

  const donnees = await reponse.json();
  const resultat = donnees.results?.[0];
  if (!resultat) return null;

  return { lat: resultat.geometry.location.lat, lng: resultat.geometry.location.lng };
}

function formatPoint(point: Coordonnees | string): string {
  return typeof point === "string" ? point : `${point.lat},${point.lng}`;
}

export async function calculerDistances(
  origine: Coordonnees | string,
  destinations: (Coordonnees | string)[]
): Promise<(string | null)[]> {
  const cle = process.env.GOOGLE_MAPS_API_KEY;
  if (!cle || destinations.length === 0) return destinations.map(() => null);

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", formatPoint(origine));
  url.searchParams.set("destinations", destinations.map(formatPoint).join("|"));
  url.searchParams.set("units", "metric");
  url.searchParams.set("language", "fr");
  url.searchParams.set("key", cle);

  const reponse = await fetch(url, { cache: "no-store" }).catch(() => null);
  if (!reponse || !reponse.ok) return destinations.map(() => null);

  const donnees = await reponse.json();
  const elements = donnees.rows?.[0]?.elements ?? [];
  return destinations.map((_, i) => (elements[i]?.status === "OK" ? elements[i].distance.text : null));
}
