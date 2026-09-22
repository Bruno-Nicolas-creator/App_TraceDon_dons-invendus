import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { calculerDistances, geocoderAdresse, isGoogleMapsServerConfigured } from "@/lib/googleMaps";
import { associationHabilitee, estGrandeSurface } from "@/lib/conformite";
import { formaterDateConges, periodeCongesActive } from "@/lib/conges";
import AssociationsProchesClient, { type AssociationAffichee } from "./AssociationsProchesClient";

export const dynamic = "force-dynamic";

export default async function AssociationsProchesPage() {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) redirect("/connexion");

  const entreprise = await prisma.entreprise.findUnique({ where: { id: session.entrepriseId } });
  if (!entreprise) {
    await clearSessionCookie();
    redirect("/connexion");
  }
  const associations = await prisma.association.findMany({
    orderBy: { denomination: "asc" },
    include: { periodesConges: true },
  });

  let centreCarte: { lat: number; lng: number } | null =
    entreprise.latitude != null && entreprise.longitude != null
      ? { lat: entreprise.latitude, lng: entreprise.longitude }
      : null;

  let distances: (string | null)[] = associations.map(() => null);

  if (isGoogleMapsServerConfigured()) {
    if (!centreCarte) {
      const coords = await geocoderAdresse(entreprise.adresse);
      if (coords) {
        await prisma.entreprise.update({ where: { id: entreprise.id }, data: { latitude: coords.lat, longitude: coords.lng } });
        centreCarte = coords;
      }
    }

    await Promise.all(
      associations.map(async (association) => {
        if (association.latitude != null && association.longitude != null) return;
        const coords = await geocoderAdresse(association.adresse);
        if (coords) {
          await prisma.association.update({ where: { id: association.id }, data: { latitude: coords.lat, longitude: coords.lng } });
          association.latitude = coords.lat;
          association.longitude = coords.lng;
        }
      })
    );

    if (centreCarte) {
      const destinations = associations.map((association) =>
        association.latitude != null && association.longitude != null
          ? { lat: association.latitude, lng: association.longitude }
          : association.adresse
      );
      distances = await calculerDistances(centreCarte, destinations);
    }
  }

  const distanceEnMetres = (texte: string | null): number => {
    if (!texte) return Infinity;
    const valeur = parseFloat(texte.replace(",", "."));
    return texte.includes("km") ? valeur * 1000 : valeur;
  };

  const avecDistance = associations.map((association, i) => ({ association, distanceKm: distances[i] }));
  avecDistance.sort((a, b) => distanceEnMetres(a.distanceKm) - distanceEnMetres(b.distanceKm));

  const associationsAffichees: AssociationAffichee[] = avecDistance.map(({ association, distanceKm }) => {
    const congesEnCours = periodeCongesActive(association.periodesConges);
    return {
      id: association.id,
      nom: association.denomination,
      adresse: association.adresse,
      distance: distanceKm ?? "—",
      categorie: association.categorieEligibilite ?? "—",
      habilitee: associationHabilitee(association.habilitationStatut),
      latitude: association.latitude,
      longitude: association.longitude,
      congesJusquau: congesEnCours ? formaterDateConges(congesEnCours.fin) : null,
    };
  });

  return (
    <AssociationsProchesClient
      associations={associationsAffichees}
      centreCarte={centreCarte}
      entrepriseGrandeSurface={estGrandeSurface(entreprise.surfaceVenteM2)}
    />
  );
}
