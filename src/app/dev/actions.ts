"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, hashPassword, landingPathForRole, type Role } from "@/lib/auth";

export type CibleDev = "ENTREPRISE" | "ASSOCIATION" | "UTILISATEUR";

/**
 * Certaines entreprises/associations de démonstration n'ont jamais été inscrites via le
 * formulaire public : elles n'ont donc aucun compte utilisateur réel (utile pour peupler les
 * annuaires, mais insuffisant pour tester un flux qui a besoin d'un email de contact, ex.
 * DocuSign). On leur crée ici un compte à la volée, utilisable uniquement via ce panneau dev.
 */
async function utilisateurDevPourOrganisation(kind: "ENTREPRISE" | "ASSOCIATION", orgId: string) {
  const champOrg = kind === "ENTREPRISE" ? { entrepriseId: orgId } : { associationId: orgId };
  const existant = await prisma.user.findFirst({ where: champOrg });
  if (existant) return existant;

  const nom =
    kind === "ENTREPRISE"
      ? (await prisma.entreprise.findUniqueOrThrow({ where: { id: orgId }, select: { raisonSociale: true } })).raisonSociale
      : (await prisma.association.findUniqueOrThrow({ where: { id: orgId }, select: { denomination: true } })).denomination;

  // Ce mot de passe n'est jamais destiné à être utilisé : la bascule se fait sans authentification
  // via basculerProfilDevAction. Il doit rester impossible à deviner ou à reconstituer, car cette
  // base de données est partagée avec la production (pas d'instance de dev séparée) — un mot de
  // passe dérivé de l'id de l'organisation serait trivialement devinable depuis une URL publique.
  return prisma.user.upsert({
    where: { email: `dev-${orgId}@exemple.fr` },
    update: {},
    create: {
      email: `dev-${orgId}@exemple.fr`,
      passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      nom: `${nom} (compte dev)`,
      role: kind,
      entrepriseId: kind === "ENTREPRISE" ? orgId : null,
      associationId: kind === "ASSOCIATION" ? orgId : null,
    },
  });
}

/**
 * Bascule instantanément la session vers une entreprise, une association ou un utilisateur
 * (coordinateur), sans mot de passe. Réservé au développement local : toute tentative en
 * production est bloquée ici, pas seulement masquée côté UI, au cas où le composant serait un
 * jour rendu par erreur.
 */
export async function basculerProfilDevAction(kind: CibleDev, identifiant: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Fonction de test réservée au développement.");
  }

  const utilisateur =
    kind === "UTILISATEUR"
      ? await prisma.user.findUnique({ where: { id: identifiant } })
      : await utilisateurDevPourOrganisation(kind, identifiant);

  if (!utilisateur) {
    throw new Error("Compte introuvable.");
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
