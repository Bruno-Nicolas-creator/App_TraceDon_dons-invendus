"use server";

import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { obtenirOuCreerConvention } from "@/lib/convention";
import { obtenirUrlSignatureEmbarqueeConvention, type RoleSignataire } from "@/lib/docusign";

async function origineRequete(): Promise<string> {
  const en = await headers();
  const proto = en.get("x-forwarded-proto") ?? "http";
  const host = en.get("host");
  return `${proto}://${host}`;
}

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

  try {
    const origin = await origineRequete();
    const url = await obtenirUrlSignatureEmbarqueeConvention(conventionId, role, origin);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur DocuSign inconnue." };
  }
}
