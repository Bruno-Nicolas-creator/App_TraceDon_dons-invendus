import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jourSemaineDuJour } from "@/lib/planning";
import { formaterDateConges, periodeCongesActive } from "@/lib/conges";
import { compterMessagesNonLus } from "@/lib/messagerie";
import { compterDonsATraiter } from "@/lib/mesDons";
import { peutDonnerAlimentaire, peutDonnerMateriel } from "@/lib/activiteEntreprise";
import { isExtractionConfiguree } from "@/lib/extractionArticles";
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

  // Les dons d'une même entreprise se ressemblent souvent d'un jour sur l'autre (dons
  // récurrents) : on reprend le titre et la description du don précédent par défaut, plutôt
  // que de repartir d'un formulaire vide à chaque fois.
  const precedent = await prisma.don.findFirst({
    where: { entrepriseId, type: "ALIMENTAIRE", NOT: { statut: "BROUILLON" } },
    orderBy: { createdAt: "desc" },
    select: { titre: true, description: true },
  });

  return prisma.don.create({
    data: { entrepriseId, type: "ALIMENTAIRE", titre: precedent?.titre, description: precedent?.description },
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
      don={{
        id: don.id,
        titre: don.titre ?? "",
        description: don.description ?? "",
        adresseRecuperation: don.adresseRecuperation ?? "",
        instructionsAcces: don.instructionsAcces ?? "",
        pieceJointeNomFichier: don.pieceJointeNomFichier,
      }}
      articles={don.articles.map((a) => ({ id: a.id, designation: a.designation, quantiteDeclaree: a.quantiteDeclaree, poidsKg: a.poidsKg, categorie: a.categorie, allergenes: a.allergenes }))}
      adresseEntreprise={entreprise.adresse}
      associationsAujourdhui={associationsAujourdhui}
      congesJusquau={congesEnCours ? formaterDateConges(congesEnCours.fin) : null}
      nonLusMessages={nonLusMessages}
      donsATraiter={await compterDonsATraiter(session.entrepriseId)}
      peutDonnerMaterielAussi={peutDonnerMateriel(entreprise.natureActivite)}
      extractionConfiguree={isExtractionConfiguree()}
    />
  );
}
