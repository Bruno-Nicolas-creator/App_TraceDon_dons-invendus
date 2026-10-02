"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { obtenirOuCreerConvention } from "@/lib/convention";
import { obtenirUrlSignatureEmbarqueeConvention, type RoleSignataire } from "@/lib/docusign";
import { origineRequete } from "@/lib/requestOrigin";
import { tropDeTentatives } from "@/lib/rateLimiter";

const MAX_TENTATIVES_DOCUSIGN = 10;
const FENETRE_DOCUSIGN_MS = 5 * 60 * 1000;

export async function demarrerConventionAction(
  autrePartieId: string
): Promise<{ ok: true; conventionId: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };

  try {
    let entrepriseId: string;
    let associationId: string;
    if (session.role === "ENTREPRISE" && session.entrepriseId) {
      entrepriseId = session.entrepriseId;
      associationId = autrePartieId;
    } else if (session.role === "ASSOCIATION" && session.associationId) {
      associationId = session.associationId;
      entrepriseId = autrePartieId;
    } else {
      return { ok: false, error: "Action réservée aux entreprises et associations." };
    }
    const convention = await obtenirOuCreerConvention(entrepriseId, associationId);
    return { ok: true, conventionId: convention.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}

export async function demarrerSignatureConventionAction(
  conventionId: string,
  role: RoleSignataire
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };

  const convention = await prisma.convention.findUnique({ where: { id: conventionId } });
  if (!convention) return { ok: false, error: "Convention introuvable." };
  const autorise =
    (role === "DONATEUR" && session.role === "ENTREPRISE" && convention.entrepriseId === session.entrepriseId) ||
    (role === "ASSOCIATION" && session.role === "ASSOCIATION" && convention.associationId === session.associationId);
  if (!autorise) return { ok: false, error: "Vous ne pouvez signer que pour votre propre organisation." };
  if (await tropDeTentatives(`docusign:${conventionId}:${session.userId}`, MAX_TENTATIVES_DOCUSIGN, FENETRE_DOCUSIGN_MS)) {
    return { ok: false, error: "Trop de tentatives, merci de patienter quelques minutes." };
  }

  try {
    const origin = await origineRequete();
    const url = await obtenirUrlSignatureEmbarqueeConvention(conventionId, role, origin);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur DocuSign inconnue." };
  }
}
