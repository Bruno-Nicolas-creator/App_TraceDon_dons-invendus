import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDocuSignConfigured, verifierEtEnregistrerSignature } from "@/lib/docusign";
import { calculerImpactCarbone } from "@/lib/impactCo2";
import BonEnlevementClient, { type ArticleAffiche, type BonAffiche } from "./BonEnlevementClient";

export default async function BonEnlevementPage({
  params,
  searchParams,
}: {
  params: Promise<{ donId: string }>;
  searchParams: Promise<{ docusignRole?: string; event?: string }>;
}) {
  const { donId } = await params;
  const { docusignRole, event } = await searchParams;

  const session = await getSession();
  if (!session) redirect("/connexion");

  const bonExistant = await prisma.bonEnlevement.findUnique({ where: { donId } });
  if (!bonExistant) notFound();

  // Retour depuis la cérémonie de signature DocuSign : on vérifie auprès de DocuSign
  // (jamais sur la seule foi du paramètre d'URL) avant d'enregistrer quoi que ce soit.
  if (event === "signing_complete" && (docusignRole === "DONATEUR" || docusignRole === "ASSOCIATION")) {
    await verifierEtEnregistrerSignature(bonExistant.id, docusignRole);
  }

  const bon = await prisma.bonEnlevement.findUnique({
    where: { donId },
    include: {
      entreprise: true,
      association: true,
      don: { include: { articles: { orderBy: { createdAt: "asc" } } } },
    },
  });

  if (!bon) notFound();
  if (session.role === "ASSOCIATION" && bon.associationId !== session.associationId) notFound();
  if (session.role === "ENTREPRISE" && bon.entrepriseId !== session.entrepriseId) notFound();
  if (session.role === "COORDINATEUR") notFound();

  const articles: ArticleAffiche[] = bon.don.articles.map((a) => ({
    id: a.id,
    nom: a.designation,
    qte: a.quantiteConstatee ?? a.quantiteDeclaree,
    poidsKg: a.poidsKg,
    temp: a.temperature ?? "—",
    dlc: a.dlcOuEtat ?? "—",
    bloque: a.dlcDepassee,
    temperatureHorsPlage: a.dlcDepassee,
    statut: a.statut,
    motifRefus: a.motifRefus ?? "",
  }));

  const impact =
    bon.confirme && bon.poidsTotalRetenu ? await calculerImpactCarbone(bon.poidsTotalRetenu) : null;

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
    poidsTotalRetenu: bon.poidsTotalRetenu,
  };

  return (
    <BonEnlevementClient
      bon={bonAffiche}
      docusignConfigure={isDocuSignConfigured()}
      impact={impact}
      role={session.role === "ENTREPRISE" ? "ENTREPRISE" : "ASSOCIATION"}
    />
  );
}
