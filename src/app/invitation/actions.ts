"use server";

import { redirect } from "next/navigation";
import { createSessionCookie, landingPathForRole, type Role } from "@/lib/auth";
import { accepterInvitation } from "@/lib/invitations";
import { tropDeTentatives } from "@/lib/rateLimiter";
import { adresseIpRequete } from "@/lib/requestOrigin";

type Etat = { ok: false; error: string } | null;

export async function accepterInvitationAction(_etat: Etat, formData: FormData): Promise<Etat> {
  if (await tropDeTentatives(`invitation-accepter:${await adresseIpRequete()}`, 10, 15 * 60 * 1000)) {
    return { ok: false, error: "Trop de tentatives. Merci de réessayer un peu plus tard." };
  }
  const resultat = await accepterInvitation(
    String(formData.get("jeton") ?? ""),
    String(formData.get("nom") ?? ""),
    String(formData.get("motDePasse") ?? ""),
    String(formData.get("confirmation") ?? "")
  );
  if ("erreur" in resultat) return { ok: false, error: resultat.erreur! };

  const u = resultat.utilisateur!;
  await createSessionCookie({ userId: u.id, nom: u.nom, role: u.role as Role, entrepriseId: u.entrepriseId, associationId: u.associationId });
  redirect(landingPathForRole(u.role as Role));
}
