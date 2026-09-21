"use server";

import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { obtenirUrlSignatureEmbarquee, type RoleSignataire } from "@/lib/docusign";

async function origineRequete(): Promise<string> {
  const en = await headers();
  const proto = en.get("x-forwarded-proto") ?? "http";
  const host = en.get("host");
  return `${proto}://${host}`;
}

export async function demarrerSignatureDocuSign(
  bonId: string,
  role: RoleSignataire
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };

  try {
    const origin = await origineRequete();
    const url = await obtenirUrlSignatureEmbarquee(bonId, role, origin);
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur DocuSign inconnue." };
  }
}
