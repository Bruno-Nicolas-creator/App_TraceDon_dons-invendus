"use server";

import { getSession } from "@/lib/auth";
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

  const bon = await prisma.bonEnlevement.findUnique({ where: { id: bonId } });
  if (!bon) return { ok: false, error: "Bon introuvable." };
  const autorise =
    (role === "DONATEUR" && session.role === "ENTREPRISE" && bon.entrepriseId === session.entrepriseId) ||
    (role === "ASSOCIATION" && session.role === "ASSOCIATION" && bon.associationId === session.associationId);
  if (!autorise) return { ok: false, error: "Vous ne pouvez signer que pour votre propre organisation." };
  if (bon.enAttenteValidationDonateur) {
    return { ok: false, error: "Le donateur doit d'abord valider cette demande de positionnement." };
  }

  // L'enveloppe DocuSign est envoyée en séquence (donateur d'abord, association ensuite) :
  // demander un lien de signature association avant que le donateur ait signé est refusé par
  // DocuSign (RECIPIENT_NOT_IN_SEQUENCE). On l'anticipe ici avec un message clair.
  if (role === "ASSOCIATION" && !bon.signatureDonateurLe) {
    return { ok: false, error: "Le donateur doit signer en premier avant que vous puissiez signer." };
  }

  try {
    const origin = await origineRequete();
    const url = await obtenirUrlSignatureEmbarquee(bonId, role, origin);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur DocuSign inconnue." };
  }
}
