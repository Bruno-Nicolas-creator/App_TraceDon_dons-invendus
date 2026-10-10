"use server";

import { getSessionLimitee as getSession } from "@/lib/sessionLimitee";
import { prisma } from "@/lib/prisma";
import { obtenirUrlSignatureEmbarquee, type RoleSignataire } from "@/lib/docusign";
import { origineRequete } from "@/lib/requestOrigin";
import { tropDeTentatives } from "@/lib/rateLimiter";

// Chaque appel déclenche un aller-retour vers l'API DocuSign, même si l'enveloppe existe déjà :
// on limite pour ne pas cogner les quotas de débit de DocuSign en cas d'appels répétés.
const MAX_TENTATIVES_DOCUSIGN = 10;
const FENETRE_DOCUSIGN_MS = 5 * 60 * 1000;

export async function demarrerSignatureDocuSign(
  bonId: string,
  role: RoleSignataire
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };
  if (await tropDeTentatives(`docusign:${bonId}:${session.userId}`, MAX_TENTATIVES_DOCUSIGN, FENETRE_DOCUSIGN_MS)) {
    return { ok: false, error: "Trop de tentatives, merci de patienter quelques minutes." };
  }

  const bon = await prisma.bonEnlevement.findUnique({ where: { id: bonId }, include: { don: { select: { statut: true } } } });
  if (!bon) return { ok: false, error: "Bon introuvable." };
  const autorise =
    (role === "DONATEUR" && session.role === "ENTREPRISE" && bon.entrepriseId === session.entrepriseId) ||
    (role === "ASSOCIATION" && session.role === "ASSOCIATION" && bon.associationId === session.associationId);
  if (!autorise) return { ok: false, error: "Vous ne pouvez signer que pour votre propre organisation." };
  if (bon.enAttenteValidationDonateur) {
    return { ok: false, error: "Le donateur doit d'abord valider cette demande de positionnement." };
  }

  // Ordre de signature libre (décision de Bruno du 2026-10-10) : seules comptent une signature
  // déjà posée par ce rôle et un bon déjà confirmé.
  if (bon.confirme) return { ok: false, error: "Ce bon est déjà confirmé." };
  if (bon.don.statut === "ANNULE") return { ok: false, error: "Ce don a été annulé : le bon ne peut plus être signé." };
  const dejaSigne = role === "DONATEUR" ? bon.signatureDonateurLe : bon.signatureAssociationLe;
  if (dejaSigne) return { ok: false, error: "Vous avez déjà signé ce bon." };

  try {
    const origin = await origineRequete();
    const url = await obtenirUrlSignatureEmbarquee(bonId, role, origin);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur DocuSign inconnue." };
  }
}
