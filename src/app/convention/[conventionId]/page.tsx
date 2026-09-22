import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDocuSignConfigured, verifierEtEnregistrerSignatureConvention } from "@/lib/docusign";
import ConventionClient, { type ConventionAffichee } from "./ConventionClient";

export default async function ConventionPage({
  params,
  searchParams,
}: {
  params: Promise<{ conventionId: string }>;
  searchParams: Promise<{ docusignRole?: string; event?: string; retour?: string }>;
}) {
  const { conventionId } = await params;
  const { docusignRole, event, retour } = await searchParams;

  const session = await getSession();
  if (!session) redirect("/connexion");

  const conventionExistante = await prisma.convention.findUnique({ where: { id: conventionId } });
  if (!conventionExistante) notFound();

  if (session.role === "ENTREPRISE" && conventionExistante.entrepriseId !== session.entrepriseId) notFound();
  if (session.role === "ASSOCIATION" && conventionExistante.associationId !== session.associationId) notFound();
  if (session.role === "COORDINATEUR") notFound();

  // Retour depuis la cérémonie de signature DocuSign : vérifié auprès de DocuSign avant tout enregistrement.
  if (event === "signing_complete" && (docusignRole === "DONATEUR" || docusignRole === "ASSOCIATION")) {
    await verifierEtEnregistrerSignatureConvention(conventionExistante.id, docusignRole);
  }

  const convention = await prisma.convention.findUniqueOrThrow({
    where: { id: conventionId },
    include: { entreprise: true, association: true },
  });

  const conventionAffichee: ConventionAffichee = {
    id: convention.id,
    entrepriseNom: convention.entreprise.raisonSociale,
    associationNom: convention.association.denomination,
    dureeAns: convention.dureeAns,
    entrepriseSignee: !!convention.signatureEntrepriseLe,
    associationSignee: !!convention.signatureAssociationLe,
    signee: convention.statut === "SIGNEE",
  };

  return (
    <ConventionClient
      convention={conventionAffichee}
      role={session.role === "ENTREPRISE" ? "ENTREPRISE" : "ASSOCIATION"}
      docusignConfigure={isDocuSignConfigured()}
      retour={retour && retour.startsWith("/") ? retour : null}
    />
  );
}
