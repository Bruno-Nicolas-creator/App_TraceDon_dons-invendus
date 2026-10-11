"use server";

import { revalidatePath } from "next/cache";
import { getSessionAdministrateur as getSession } from "@/lib/sessionLimitee";
import { prisma } from "@/lib/prisma";
import {
  envoyerInteretGeneralPourSignature,
  obtenirUrlSignatureEmbarqueeInteretGeneral,
} from "@/lib/docusign";
import { origineRequete } from "@/lib/requestOrigin";
import { tropDeTentatives } from "@/lib/rateLimiter";

const MAX_TENTATIVES_DOCUSIGN = 10;
const FENETRE_DOCUSIGN_MS = 5 * 60 * 1000;

export async function genererEtEnvoyerInteretGeneralAction(
  formData: FormData
): Promise<{ ok: true; nombreEnvoyees: number } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) {
    return { ok: false, error: "Action réservée aux entreprises." };
  }

  const associationIds = formData.getAll("associationId").map(String);
  if (associationIds.length === 0) return { ok: false, error: "Sélectionnez au moins une association." };

  let nombreEnvoyees = 0;
  for (const associationId of associationIds) {
    const attestation = await prisma.attestationInteretGeneral.upsert({
      where: { entrepriseId_associationId: { entrepriseId: session.entrepriseId, associationId } },
      update: {},
      create: { entrepriseId: session.entrepriseId, associationId },
    });
    if (attestation.statut === "SIGNEE") continue;
    try {
      await envoyerInteretGeneralPourSignature(attestation.id);
      nombreEnvoyees += 1;
    } catch {
      // L'attestation reste créée (statut BROUILLON) même si l'envoi échoue : elle
      // pourra être renvoyée manuellement depuis les archives.
    }
  }

  revalidatePath("/archives");
  revalidatePath("/attestation-interet-general/nouvelle");
  return { ok: true, nombreEnvoyees };
}

export async function demarrerSignatureInteretGeneralAction(
  attestationId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    return { ok: false, error: "Action réservée aux associations." };
  }

  const attestation = await prisma.attestationInteretGeneral.findUnique({ where: { id: attestationId } });
  if (!attestation) return { ok: false, error: "Attestation introuvable." };
  if (attestation.associationId !== session.associationId) {
    return { ok: false, error: "Vous ne pouvez signer que les attestations qui vous sont adressées." };
  }
  if (await tropDeTentatives(`docusign:${attestationId}:${session.userId}`, MAX_TENTATIVES_DOCUSIGN, FENETRE_DOCUSIGN_MS)) {
    return { ok: false, error: "Trop de tentatives, merci de patienter quelques minutes." };
  }

  try {
    const origin = await origineRequete();
    const url = await obtenirUrlSignatureEmbarqueeInteretGeneral(attestationId, origin);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur DocuSign inconnue." };
  }
}
