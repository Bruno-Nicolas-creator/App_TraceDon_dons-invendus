import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import DonsDisponiblesClient, { type DonAffiche } from "./DonsDisponiblesClient";

export const dynamic = "force-dynamic";

export default async function DonsDisponiblesPage() {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) redirect("/connexion");

  const dons = await prisma.don.findMany({
    where: {
      OR: [
        { statut: "PUBLIE" },
        { statut: "PRIS_EN_CHARGE", associationAssigneeId: session.associationId },
      ],
    },
    include: { entreprise: true, articles: true },
    orderBy: { publieLe: "desc" },
  });

  const donsAffiches: DonAffiche[] = dons.map((don) => ({
    id: don.id,
    nom: don.entreprise.raisonSociale,
    adresse: don.entreprise.adresse,
    distance: don.distanceLabel ?? "—",
    categorie: don.categorie,
    poids: `${don.articles.reduce((total, a) => total + a.poidsKg, 0).toLocaleString("fr-FR")} kg`,
    positionne: don.statut === "PRIS_EN_CHARGE",
  }));

  return <DonsDisponiblesClient dons={donsAffiches} />;
}
