"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, landingPathForRole, type Role } from "@/lib/auth";

/**
 * Bascule instantanément la session vers un compte de démonstration, sans mot de passe.
 * Réservé au développement local : toute tentative en production est bloquée ici, pas
 * seulement masquée côté UI, au cas où le composant serait un jour rendu par erreur.
 */
export async function basculerProfilDevAction(email: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Fonction de test réservée au développement.");
  }

  const utilisateur = await prisma.user.findUnique({ where: { email } });
  if (!utilisateur) {
    throw new Error("Compte de démonstration introuvable.");
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
