"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, landingPathForRole, verifyPassword, type Role } from "@/lib/auth";
import { tropDeTentatives } from "@/lib/rateLimiter";

const MAX_TENTATIVES_CONNEXION = 10;
const FENETRE_CONNEXION_MS = 5 * 60 * 1000;

export async function connexionAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");

  if (!email || !motDePasse) {
    redirect("/connexion?erreur=1");
  }

  if (await tropDeTentatives(`connexion:${email}`, MAX_TENTATIVES_CONNEXION, FENETRE_CONNEXION_MS)) {
    redirect("/connexion?erreur=trop_de_tentatives");
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
