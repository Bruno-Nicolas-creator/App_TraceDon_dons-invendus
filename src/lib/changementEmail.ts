import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { envoyerEmail } from "@/lib/email";
import { empreinte } from "@/lib/reinitialisation";

/**
 * Changement de l'adresse e-mail de connexion (chantier C4b, 2026-10-10) : mot de passe actuel
 * exigé, lien de confirmation envoyé à la NOUVELLE adresse (1 heure, usage unique), changement
 * effectif seulement au clic ; l'ancienne adresse est alors prévenue.
 */

const DUREE_VALIDITE_MS = 60 * 60 * 1000;
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function demanderChangementEmail(
  userId: string,
  motDePasse: string,
  nouvelEmailBrut: string,
  origineSite: string
): Promise<string | null> {
  const nouvelEmail = nouvelEmailBrut.trim().toLowerCase();
  if (!FORMAT_EMAIL.test(nouvelEmail) || nouvelEmail.length > 200) return "Adresse e-mail invalide.";

  const utilisateur = await prisma.user.findUnique({ where: { id: userId } });
  if (!utilisateur || !(await verifyPassword(motDePasse, utilisateur.passwordHash))) return "Le mot de passe est incorrect.";
  if (nouvelEmail === utilisateur.email) return "C'est déjà l'adresse de votre compte.";
  if (await prisma.user.findUnique({ where: { email: nouvelEmail }, select: { id: true } })) {
    return "Cette adresse est déjà utilisée par un autre compte.";
  }

  const jeton = crypto.randomBytes(32).toString("base64url");
  await prisma.$transaction([
    // Une seule demande en attente à la fois.
    prisma.jetonReinitialisation.deleteMany({ where: { userId, utiliseLe: null, nouvelEmail: { not: null } } }),
    prisma.jetonReinitialisation.create({
      data: { userId, empreinte: empreinte(jeton), nouvelEmail, expireLe: new Date(Date.now() + DUREE_VALIDITE_MS) },
    }),
  ]);

  await envoyerEmail(
    [nouvelEmail],
    "Confirmez votre nouvelle adresse e-mail TraceDon",
    `Bonjour ${utilisateur.nom},\n\nPour que cette adresse devienne celle de votre compte TraceDon, ouvrez ce lien (valable 1 heure) :\n${origineSite}/confirmer-email?jeton=${jeton}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : rien ne changera.\n\nTraceDon`
  );
  return null;
}

/** Applique le changement ; renvoie null si c'est fait, sinon le motif du refus. */
export async function confirmerChangementEmail(jeton: string): Promise<string | null> {
  const ligne = jeton ? await prisma.jetonReinitialisation.findUnique({ where: { empreinte: empreinte(jeton) } }) : null;
  if (!ligne || !ligne.nouvelEmail) return "Ce lien n'est pas valable.";

  try {
    const resultat = await prisma.$transaction(async (tx) => {
      const { count } = await tx.jetonReinitialisation.updateMany({
        where: { id: ligne.id, utiliseLe: null, expireLe: { gt: new Date() } },
        data: { utiliseLe: new Date() },
      });
      if (count === 0) return null;
      const avant = await tx.user.findUniqueOrThrow({ where: { id: ligne.userId }, select: { email: true, nom: true } });
      await tx.user.update({ where: { id: ligne.userId }, data: { email: ligne.nouvelEmail! } });
      return avant;
    });
    if (!resultat) return "Ce lien n'est plus valable (déjà utilisé ou expiré). Refaites la demande depuis votre profil.";

    await envoyerEmail(
      [resultat.email],
      "L'adresse e-mail de votre compte TraceDon a changé",
      `Bonjour ${resultat.nom},\n\nL'adresse e-mail de connexion de votre compte TraceDon vient d'être remplacée par ${ligne.nouvelEmail}. Vous ne recevrez plus nos messages à cette adresse-ci.\n\nSi vous n'êtes pas à l'origine de ce changement, contactez au plus vite le coordinateur TraceDon.\n\nTraceDon`
    );
    return null;
  } catch (e) {
    // Adresse prise par un autre compte entre la demande et la confirmation (contrainte d'unicité).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return "Cette adresse est désormais utilisée par un autre compte.";
    }
    throw e;
  }
}
