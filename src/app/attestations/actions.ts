"use server";

import { revalidatePath } from "next/cache";
import { getSessionLimitee as getSession } from "@/lib/sessionLimitee";
import { prisma } from "@/lib/prisma";
import { bonsEligiblesParBeneficiaire, genererNumeroOrdreAttestation } from "@/lib/attestationFiscale";
import { envoyerAttestationPourSignature, obtenirUrlSignatureEmbarqueeAttestation } from "@/lib/docusign";
import { origineRequete } from "@/lib/requestOrigin";
import { tropDeTentatives } from "@/lib/rateLimiter";

const MAX_TENTATIVES_DOCUSIGN = 10;
const FENETRE_DOCUSIGN_MS = 5 * 60 * 1000;

export async function genererEtEnvoyerAttestationsAction(
  formData: FormData
): Promise<{ ok: true; nombreCreees: number } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) {
    return { ok: false, error: "Action réservée aux entreprises." };
  }

  const debutBrut = String(formData.get("periodeDebut") ?? "").trim();
  const finBrut = String(formData.get("periodeFin") ?? "").trim();
  const associationIds = formData.getAll("associationId").map(String);
  if (!debutBrut || !finBrut) return { ok: false, error: "Les dates de début et de fin sont requises." };
  if (associationIds.length === 0) return { ok: false, error: "Sélectionnez au moins une association." };

  const periodeDebut = new Date(debutBrut);
  const periodeFin = new Date(`${finBrut}T23:59:59`);
  if (Number.isNaN(periodeDebut.getTime()) || Number.isNaN(periodeFin.getTime()) || periodeFin < periodeDebut) {
    return { ok: false, error: "Période invalide." };
  }

  const groupes = (await bonsEligiblesParBeneficiaire(session.entrepriseId, periodeDebut, periodeFin)).filter((g) =>
    associationIds.includes(g.associationId)
  );
  if (groupes.length === 0) {
    return { ok: false, error: "Aucun bon éligible pour les associations sélectionnées sur cette période." };
  }

  let nombreCreees = 0;
  for (const groupe of groupes) {
    const numeroOrdre = await genererNumeroOrdreAttestation();
    const attestation = await prisma.attestationFiscale.create({
      data: {
        numeroOrdre,
        entrepriseId: session.entrepriseId,
        associationId: groupe.associationId,
        periodeDebut,
        periodeFin,
        montantCalcule: groupe.montantEstime,
        bonsEnlevement: { connect: groupe.bonIds.map((id) => ({ id })) },
      },
    });
    try {
      await envoyerAttestationPourSignature(attestation.id);
      nombreCreees += 1;
    } catch {
      // L'attestation reste créée (statut BROUILLON) même si l'envoi échoue : elle
      // pourra être renvoyée manuellement depuis les archives.
    }
  }

  revalidatePath("/archives");
  revalidatePath("/attestations/nouvelle");
  return { ok: true, nombreCreees };
}

export async function demarrerSignatureAttestationAction(
  attestationId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    return { ok: false, error: "Action réservée aux associations." };
  }

  const attestation = await prisma.attestationFiscale.findUnique({ where: { id: attestationId } });
  if (!attestation) return { ok: false, error: "Attestation introuvable." };
  if (attestation.associationId !== session.associationId) {
    return { ok: false, error: "Vous ne pouvez signer que les attestations qui vous sont adressées." };
  }
  if (await tropDeTentatives(`docusign:${attestationId}:${session.userId}`, MAX_TENTATIVES_DOCUSIGN, FENETRE_DOCUSIGN_MS)) {
    return { ok: false, error: "Trop de tentatives, merci de patienter quelques minutes." };
  }

  try {
    const origin = await origineRequete();
    const url = await obtenirUrlSignatureEmbarqueeAttestation(attestationId, origin);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur DocuSign inconnue." };
  }
}
