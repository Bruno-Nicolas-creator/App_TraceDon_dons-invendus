import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDocuSignConfigured, verifierEtEnregistrerSignature } from "@/lib/docusign";
import { calculerImpactCarboneDetaille } from "@/lib/impactCo2";
import { articlesDuBon } from "@/lib/donDivisible";
import BonEnlevementClient, { type ArticleAffiche, type BonAffiche } from "./BonEnlevementClient";

export default async function BonEnlevementPage({
  params,
  searchParams,
}: {
  params: Promise<{ bonId: string }>;
  searchParams: Promise<{ docusignRole?: string; event?: string }>;
}) {
  const { bonId } = await params;
  const { docusignRole, event } = await searchParams;

  const session = await getSession();
  if (!session) redirect("/connexion");

  const bonExistant = await prisma.bonEnlevement.findUnique({ where: { id: bonId } });
  if (!bonExistant) notFound();
  // Contrôle d'appartenance fait avant tout, y compris avant la vérification DocuSign ci-dessous :
  // sans ça, n'importe quel compte connecté pourrait déclencher une écriture et une notification
  // sur le bon d'un autre (le bonId est visible dans le QR code imprimé sur le document).
  if (session.role === "ASSOCIATION" && bonExistant.associationId !== session.associationId) notFound();
  if (session.role === "ENTREPRISE" && bonExistant.entrepriseId !== session.entrepriseId) notFound();
  if (session.role === "COORDINATEUR") notFound();

  // Retour depuis la cérémonie de signature DocuSign : on vérifie auprès de DocuSign
  // (jamais sur la seule foi du paramètre d'URL) avant d'enregistrer quoi que ce soit.
  if (event === "signing_complete" && (docusignRole === "DONATEUR" || docusignRole === "ASSOCIATION")) {
    await verifierEtEnregistrerSignature(bonExistant.id, docusignRole);
  }

  const bon = await prisma.bonEnlevement.findUnique({
    where: { id: bonId },
    include: {
      entreprise: true,
      association: true,
      benevoleCollecteur: true,
      don: { include: { articles: { orderBy: { createdAt: "asc" } } } },
    },
  });

  if (!bon) notFound();

  const benevolesMandates =
    session.role === "ASSOCIATION"
      ? (
          await prisma.benevole.findMany({
            where: { associationId: bon.associationId, mandatDonneLe: { not: null } },
            orderBy: { nom: "asc" },
          })
        ).map((b) => ({ id: b.id, nom: b.nom }))
      : [];

  // Don matériel divisible : ce bon ne porte que les articles réclamés par cette association,
  // pas l'ensemble du don (les autres associations ont chacune le leur).
  const articlesDuLot = articlesDuBon(bon.don, bon.don.articles, bon.associationId);

  const articles: ArticleAffiche[] = articlesDuLot.map((a) => ({
    id: a.id,
    nom: a.designation,
    qte: a.quantiteConstatee ?? a.quantiteDeclaree,
    poidsKg: a.poidsKg,
    temp: a.temperature ?? "—",
    dlc: a.dlcOuEtat ?? "—",
    bloque: a.dlcDepassee,
    statut: a.statut,
    motifRefus: a.motifRefus ?? "",
    aUnePhoto: !!a.photoContentType,
    allergenes: a.allergenes,
  }));

  // Le facteur CO2/kg est propre à l'alimentaire : un bon de don matériel n'a pas d'équivalent pertinent.
  const impact =
    bon.confirme && bon.don.type !== "MATERIEL"
      ? await calculerImpactCarboneDetaille(
          articlesDuLot.filter((a) => a.statut === "VALIDE").map((a) => ({ poidsKg: a.poidsKg, categorie: a.categorie }))
        )
      : null;

  const bonAffiche: BonAffiche = {
    id: bon.id,
    donId: bon.donId,
    numero: bon.numero,
    entrepriseNom: bon.entreprise.raisonSociale,
    associationNom: bon.association.denomination,
    articles,
    donateurSigne: !!bon.signatureDonateurLe,
    associationSigne: !!bon.signatureAssociationLe,
    confirme: bon.confirme,
    enAttenteValidationDonateur: bon.enAttenteValidationDonateur,
    poidsTotalRetenu: bon.poidsTotalRetenu,
    typeDon: bon.don.type,
    divisible: bon.don.divisible,
    instructionsAcces: bon.don.instructionsAcces,
    titre: bon.don.titre,
    description: bon.don.description,
    adresseRecuperation: bon.don.adresseRecuperation ?? bon.entreprise.adresse,
    aUnePieceJointe: !!bon.don.pieceJointeContentType,
    benevoleCollecteurId: bon.benevoleCollecteurId,
    benevoleCollecteurNom: bon.benevoleCollecteur?.nom ?? null,
  };

  return (
    <BonEnlevementClient
      bon={bonAffiche}
      docusignConfigure={isDocuSignConfigured()}
      impact={impact}
      role={session.role === "ENTREPRISE" ? "ENTREPRISE" : "ASSOCIATION"}
      benevolesMandates={benevolesMandates}
    />
  );
}
