import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDocuSignConfigured, verifierEtEnregistrerSignatureAttestation } from "@/lib/docusign";
import AttestationSignatureClient, { type AttestationSignatureAffichee } from "./AttestationSignatureClient";

export default async function AttestationSignaturePage({
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

  const attestationExistante = await prisma.attestationFiscale.findUnique({ where: { id: attestationId } });
  if (!attestationExistante) notFound();

  if (session.role === "ENTREPRISE" && attestationExistante.entrepriseId !== session.entrepriseId) notFound();
  if (session.role === "ASSOCIATION" && attestationExistante.associationId !== session.associationId) notFound();
  if (session.role === "COORDINATEUR") notFound();

  // Retour depuis la cérémonie de signature DocuSign : vérifié auprès de DocuSign avant tout enregistrement.
  if (event === "signing_complete") {
    await verifierEtEnregistrerSignatureAttestation(attestationExistante.id);
  }

  const attestation = await prisma.attestationFiscale.findUniqueOrThrow({
    where: { id: attestationId },
    include: { entreprise: true, association: true },
  });

  const attestationAffichee: AttestationSignatureAffichee = {
    id: attestation.id,
    numeroOrdre: attestation.numeroOrdre,
    entrepriseNom: attestation.entreprise.raisonSociale,
    associationNom: attestation.association.denomination,
    periodeDebut: attestation.periodeDebut.toISOString(),
    periodeFin: attestation.periodeFin.toISOString(),
    montantCalcule: attestation.montantCalcule,
    signee: attestation.statut === "SIGNEE",
    peutSigner: session.role === "ASSOCIATION",
  };

  return <AttestationSignatureClient attestation={attestationAffichee} docusignConfigure={isDocuSignConfigured()} />;
}
