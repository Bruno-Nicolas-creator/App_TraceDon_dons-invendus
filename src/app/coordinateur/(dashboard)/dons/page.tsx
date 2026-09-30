import { prisma } from "@/lib/prisma";
import { articlesEntierementReclames } from "@/lib/donDivisible";
import DonsClient, { type DonLigne } from "./DonsClient";

export const dynamic = "force-dynamic";

const formatDate = (date: Date) =>
  date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function CoordinateurDonsPage() {
  const dons = await prisma.don.findMany({
    where: { statut: { not: "BROUILLON" } },
    include: { entreprise: true, associationAssignee: true, articles: { include: { associationAssignee: true } } },
    orderBy: { createdAt: "desc" },
  });

  const donsAffiches: DonLigne[] = dons.map((don) => {
    // Don matériel divisible : plusieurs associations peuvent s'être partagé les articles,
    // chacune avec son propre bon — on les liste toutes.
    const associationsDuLot = don.divisible
      ? [...new Set(don.articles.map((a) => a.associationAssignee?.denomination).filter((n): n is string => !!n))]
      : don.associationAssignee
        ? [don.associationAssignee.denomination]
        : [];
    const nbReclames = don.articles.filter((a) => a.associationAssigneeId != null).length;
    return {
      id: don.id,
      entreprise: don.entreprise.raisonSociale,
      associations: associationsDuLot,
      statut: don.statut as DonLigne["statut"],
      // "Publié" mais déjà partiellement réclamé : un don divisible n'est marqué "Pris en
      // charge" que lorsque tous ses articles ont trouvé preneur.
      partiel: don.statut === "PUBLIE" && don.divisible && nbReclames > 0 && !articlesEntierementReclames(don),
      poidsKg: don.articles.reduce((t, a) => t + a.poidsKg, 0),
      publieLe: don.publieLe ? formatDate(don.publieLe) : "—",
    };
  });

  return <DonsClient dons={donsAffiches} />;
}
