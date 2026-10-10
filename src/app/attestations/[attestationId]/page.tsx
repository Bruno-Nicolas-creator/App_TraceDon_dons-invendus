import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDocuSignConfigured, verifierEtEnregistrerSignatureAttestation } from "@/lib/docusign";
import { montantDuRecu } from "@/lib/attestationFiscale";
import AttestationSignatureClient, { type AttestationSignatureAffichee } from "./AttestationSignatureClient";

export const dynamic = "force-dynamic";

const formatDate = (date: Date) =>
  date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

export default async function AttestationSignaturePage({
  params,
  searchParams,
}: {
  params: Promise<{ attestationId: string }>;
  searchParams: Promise<{ event?: string; envoyee?: string }>;
}) {
  const { attestationId } = await params;
  const { event, envoyee } = await searchParams;

  const session = await getSession();
  if (!session) redirect("/connexion");

  const attestationExistante = await prisma.attestationFiscale.findUnique({
    where: { id: attestationId },
    select: { id: true, entrepriseId: true, associationId: true },
  });
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
    select: {
      id: true,
      numeroOrdre: true,
      statut: true,
      annee: true,
      periodeDebut: true,
      periodeFin: true,
      montantCalcule: true,
      montantValorise: true,
      motifContestation: true,
      demandeLe: true,
      emisLe: true,
      justificatifNomFichier: true,
      entreprise: { select: { raisonSociale: true } },
      association: { select: { denomination: true, declarationInteretGeneral: true } },
      bonsEnlevement: {
        select: { numero: true, dateHeureEnlevement: true, poidsTotalRetenu: true, don: { select: { type: true } } },
        orderBy: { dateHeureEnlevement: "asc" },
      },
    },
  });

  const attestationAffichee: AttestationSignatureAffichee = {
    id: attestation.id,
    numeroOrdre: attestation.numeroOrdre,
    statut: attestation.statut,
    entrepriseNom: attestation.entreprise.raisonSociale,
    associationNom: attestation.association.denomination,
    periode: attestation.annee
      ? `Année ${attestation.annee}`
      : `${formatDate(attestation.periodeDebut)} – ${formatDate(attestation.periodeFin)}`,
    montant: montantDuRecu(attestation),
    motifContestation: attestation.motifContestation,
    demandeLe: attestation.demandeLe ? formatDate(attestation.demandeLe) : null,
    emisLe: attestation.emisLe ? formatDate(attestation.emisLe) : null,
    justificatifNom: attestation.justificatifNomFichier,
    interetGeneralDeclare: attestation.association.declarationInteretGeneral,
    bons: attestation.bonsEnlevement.map((b) => ({
      numero: b.numero,
      date: b.dateHeureEnlevement ? formatDate(b.dateHeureEnlevement) : "—",
      poids: b.poidsTotalRetenu ? `${b.poidsTotalRetenu.toLocaleString("fr-FR")} kg` : null,
      nature: b.don.type === "MATERIEL" ? "Matériel" : "Alimentaire",
    })),
    role: session.role === "ASSOCIATION" ? "ASSOCIATION" : "ENTREPRISE",
    vientDEtreEnvoyee: envoyee === "1" && attestation.statut === "DEMANDEE",
  };

  return <AttestationSignatureClient attestation={attestationAffichee} docusignConfigure={isDocuSignConfigured()} />;
}
