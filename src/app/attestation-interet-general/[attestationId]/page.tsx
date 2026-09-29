import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDocuSignConfigured, verifierEtEnregistrerSignatureInteretGeneral } from "@/lib/docusign";
import AttestationInteretGeneralSignatureClient, {
  type AttestationInteretGeneralSignatureAffichee,
} from "./AttestationInteretGeneralSignatureClient";

export default async function AttestationInteretGeneralSignaturePage({
  params,
  searchParams,
}: {
  params: Promise<{ attestationId: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { attestationId } = await params;
  const { event } = await searchParams;

  const session = await getSession();
  if (!session) redirect("/connexion");

  const attestationExistante = await prisma.attestationInteretGeneral.findUnique({ where: { id: attestationId } });
  if (!attestationExistante) notFound();

  if (session.role === "ENTREPRISE" && attestationExistante.entrepriseId !== session.entrepriseId) notFound();
  if (session.role === "ASSOCIATION" && attestationExistante.associationId !== session.associationId) notFound();
  if (session.role === "COORDINATEUR") notFound();

  // Retour depuis la cérémonie de signature DocuSign : on vérifie auprès de DocuSign
  // (jamais sur la seule foi du paramètre d'URL) avant d'enregistrer quoi que ce soit.
  if (event === "signing_complete") {
    await verifierEtEnregistrerSignatureInteretGeneral(attestationExistante.id);
  }

  const attestation = await prisma.attestationInteretGeneral.findUniqueOrThrow({
    where: { id: attestationId },
    include: { entreprise: true, association: true },
  });

  const attestationAffichee: AttestationInteretGeneralSignatureAffichee = {
    id: attestation.id,
    entrepriseNom: attestation.entreprise.raisonSociale,
    associationNom: attestation.association.denomination,
    signee: attestation.statut === "SIGNEE",
    peutSigner: session.role === "ASSOCIATION",
  };

  return (
    <AttestationInteretGeneralSignatureClient
      attestation={attestationAffichee}
      docusignConfigure={isDocuSignConfigured()}
    />
  );
}
