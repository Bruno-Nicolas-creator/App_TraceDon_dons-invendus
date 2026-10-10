import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { peutDonnerMateriel } from "@/lib/activiteEntreprise";
import { formaterDateConges, periodeCongesActive } from "@/lib/conges";
import { compterMessagesNonLus } from "@/lib/messagerie";
import { compterDonsATraiter } from "@/lib/mesDons";
import NouveauDonMaterielClient from "./NouveauDonMaterielClient";

export const dynamic = "force-dynamic";

async function getOrCreateBrouillonMateriel(entrepriseId: string) {
  const existant = await prisma.don.findFirst({
    where: { entrepriseId, statut: "BROUILLON", type: "MATERIEL" },
    include: { articles: { orderBy: { createdAt: "asc" } } },
  });
  if (existant) return existant;

  return prisma.don.create({
    data: { entrepriseId, type: "MATERIEL", categorie: "Non alimentaire" },
    include: { articles: true },
  });
}

export default async function NouveauDonMaterielPage() {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) redirect("/connexion");

  const entreprise = await prisma.entreprise.findUniqueOrThrow({ where: { id: session.entrepriseId } });
  if (!peutDonnerMateriel(entreprise.natureActivite)) redirect("/");

  const don = await getOrCreateBrouillonMateriel(session.entrepriseId);

  const periodesConges = await prisma.periodeConges.findMany({ where: { entrepriseId: session.entrepriseId } });
  const congesEnCours = periodeCongesActive(periodesConges);
  const nonLusMessages = await compterMessagesNonLus(session);

  // Don matériel divisible : demandes de positionnement en attente de l'accord du donateur
  // (cf. sePositionner / validerPositionnementAction) — à traiter avant que l'association ne
  // puisse signer quoi que ce soit.
  const demandesEnAttente = await prisma.bonEnlevement.findMany({
    where: { entrepriseId: session.entrepriseId, enAttenteValidationDonateur: true },
    include: { association: true, don: { include: { articles: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <NouveauDonMaterielClient
      don={{
        id: don.id,
        titre: don.titre ?? "",
        description: don.description ?? "",
        adresseRecuperation: don.adresseRecuperation ?? "",
        pieceJointeNomFichier: don.pieceJointeNomFichier,
        divisible: don.divisible,
        instructionsAcces: don.instructionsAcces ?? "",
        articles: don.articles.map((a) => ({ id: a.id, designation: a.designation, quantiteDeclaree: a.quantiteDeclaree, aUnePhoto: !!a.photoContentType })),
      }}
      demandesEnAttente={demandesEnAttente.map((bon) => ({
        bonId: bon.id,
        associationNom: bon.association.denomination,
        articles: bon.don.articles
          .filter((a) => a.associationAssigneeId === bon.associationId)
          .map((a) => ({ designation: a.designation, quantiteDeclaree: a.quantiteDeclaree })),
      }))}
      adresseEntreprise={entreprise.adresse}
      peutDonnerAlimentaireAussi={entreprise.natureActivite === "ALIMENTAIRE_ET_NON_ALIMENTAIRE"}
      congesJusquau={congesEnCours ? formaterDateConges(congesEnCours.fin) : null}
      nonLusMessages={nonLusMessages}
      donsATraiter={await compterDonsATraiter(session.entrepriseId)}
    />
  );
}
