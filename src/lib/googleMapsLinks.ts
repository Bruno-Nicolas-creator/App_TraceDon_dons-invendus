export function lienItineraire(point: { adresse: string; latitude: number | null; longitude: number | null }): string {
  const destination = point.latitude != null && point.longitude != null ? `${point.latitude},${point.longitude}` : point.adresse;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
