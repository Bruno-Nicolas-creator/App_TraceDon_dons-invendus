import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jourSemaineDuJour } from "@/lib/planning";
import { formaterDateConges, periodeCongesActive } from "@/lib/conges";
import { compterMessagesNonLus } from "@/lib/messagerie";
import { peutDonnerAlimentaire, peutDonnerMateriel } from "@/lib/activiteEntreprise";
import NouveauDonClient from "./NouveauDonClient";

// Cette page peut créer un brouillon en base : elle ne doit jamais être
// pré-rendue statiquement (build) ni servie depuis un cache obsolète.
export const dynamic = "force-dynamic";

async function getOrCreateBrouillon(entrepriseId: string) {
  const existant = await prisma.don.findFirst({
    where: { entrepriseId, statut: "BROUILLON", type: "ALIMENTAIRE" },
    include: { articles: { orderBy: { createdAt: "asc" } } },
  });
  if (existant) return existant;

  return prisma.don.create({
    data: { entrepriseId, type: "ALIMENTAIRE" },
    include: { articles: true },
  });
}

export default async function NouveauDonPage() {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) redirect("/connexion");

  const entreprise = await prisma.entreprise.findUniqueOrThrow({ where: { id: session.entrepriseId } });
  if (!peutDonnerAlimentaire(entreprise.natureActivite)) redirect("/nouveau-don-materiel");

  const don = await getOrCreateBrouillon(session.entrepriseId);

  const assignationsAujourdhui = await prisma.assignationRecurrente.findMany({
    where: { entrepriseId: session.entrepriseId, jourSemaine: jourSemaineDuJour(new Date()), actif: true },
    include: { association: true },
  });
  const associationsAujourdhui = assignationsAujourdhui.map((a) => a.association.denomination);

  const periodesConges = await prisma.periodeConges.findMany({ where: { entrepriseId: session.entrepriseId } });
  const congesEnCours = periodeCongesActive(periodesConges);
  const nonLusMessages = await compterMessagesNonLus(session);

  return (
    <NouveauDonClient
      don={don}
      associationsAujourdhui={associationsAujourdhui}
      congesJusquau={congesEnCours ? formaterDateConges(congesEnCours.fin) : null}
      nonLusMessages={nonLusMessages}
      peutDonnerMaterielAussi={peutDonnerMateriel(entreprise.natureActivite)}
    />
  );
}
