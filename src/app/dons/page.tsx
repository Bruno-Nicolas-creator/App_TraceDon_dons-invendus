import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { calculerDistances, geocoderAdresse, isGoogleMapsServerConfigured } from "@/lib/googleMaps";
import { formaterDateConges, periodeCongesActive } from "@/lib/conges";
import DonsDisponiblesClient, { type DonAffiche } from "./DonsDisponiblesClient";

export const dynamic = "force-dynamic";

export default async function DonsDisponiblesPage() {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) redirect("/connexion");

  const association = await prisma.association.findUnique({
    where: { id: session.associationId },
    include: { periodesConges: true },
  });
  if (!association) {
    // Le compte associé à cette session a été supprimé entre-temps : on force une reconnexion
    // plutôt que de laisser la page planter sur une association introuvable.
    await clearSessionCookie();
    redirect("/connexion");
  }
  const congesAssociationEnCours = periodeCongesActive(association.periodesConges);
  const dons = await prisma.don.findMany({
    where: {
      OR: [
        { statut: "PUBLIE" },
        { statut: "PRIS_EN_CHARGE", associationAssigneeId: session.associationId },
      ],
    },
    include: { entreprise: { include: { periodesConges: true } }, articles: true },
    orderBy: { publieLe: "desc" },
  });

  let centreCarte: { lat: number; lng: number } | null =
    association.latitude != null && association.longitude != null
      ? { lat: association.latitude, lng: association.longitude }
      : null;

  let distances: (string | null)[] = dons.map(() => null);

  if (isGoogleMapsServerConfigured()) {
    if (!centreCarte) {
      const coords = await geocoderAdresse(association.adresse);
      if (coords) {
        await prisma.association.update({ where: { id: association.id }, data: { latitude: coords.lat, longitude: coords.lng } });
        centreCarte = coords;
      }
    }

    await Promise.all(
      dons.map(async (don) => {
        if (don.entreprise.latitude != null && don.entreprise.longitude != null) return;
        const coords = await geocoderAdresse(don.entreprise.adresse);
        if (coords) {
          await prisma.entreprise.update({ where: { id: don.entrepriseId }, data: { latitude: coords.lat, longitude: coords.lng } });
          don.entreprise.latitude = coords.lat;
          don.entreprise.longitude = coords.lng;
        }
      })
    );

    if (centreCarte) {
      const destinations = dons.map((don) =>
        don.entreprise.latitude != null && don.entreprise.longitude != null
          ? { lat: don.entreprise.latitude, lng: don.entreprise.longitude }
          : don.entreprise.adresse
      );
      distances = await calculerDistances(centreCarte, destinations);
    }
  }

  const donsAffiches: DonAffiche[] = dons.map((don, i) => {
    const congesEntreprise = periodeCongesActive(don.entreprise.periodesConges);
    return {
      id: don.id,
      nom: don.entreprise.raisonSociale,
      adresse: don.entreprise.adresse,
      distance: distances[i] ?? don.distanceLabel ?? "—",
      categorie: don.categorie,
      poids: `${don.articles.reduce((total, a) => total + a.poidsKg, 0).toLocaleString("fr-FR")} kg`,
      positionne: don.statut === "PRIS_EN_CHARGE",
      latitude: don.entreprise.latitude,
      longitude: don.entreprise.longitude,
      congesJusquau: congesEntreprise ? formaterDateConges(congesEntreprise.fin) : null,
    };
  });

  return (
    <DonsDisponiblesClient
      dons={donsAffiches}
      centreCarte={centreCarte}
      congesAssociationJusquau={congesAssociationEnCours ? formaterDateConges(congesAssociationEnCours.fin) : null}
    />
  );
}
