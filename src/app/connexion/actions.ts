"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, landingPathForRole, verifyPassword, type Role } from "@/lib/auth";

export async function connexionAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");

  if (!email || !motDePasse) {
    redirect("/connexion?erreur=1");
  }

  const utilisateur = await prisma.user.findUnique({ where: { email } });
  if (!utilisateur) {
    redirect("/connexion?erreur=1");
  }

  const motDePasseValide = await verifyPassword(motDePasse, utilisateur.passwordHash);
  if (!motDePasseValide) {
    redirect("/connexion?erreur=1");
  }

  await createSessionCookie({
    userId: utilisateur.id,
    nom: utilisateur.nom,
    role: utilisateur.role as Role,
    entrepriseId: utilisateur.entrepriseId,
    associationId: utilisateur.associationId,
  });

  redirect(landingPathForRole(utilisateur.role as Role));
}
