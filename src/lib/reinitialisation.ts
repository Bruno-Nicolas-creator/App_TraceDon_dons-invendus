import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { envoyerEmail } from "@/lib/email";

/**
 * Mot de passe oublié (chantier C4a, 2026-10-10) : un lien envoyé par e-mail, valable 1 heure et
 * utilisable une seule fois. Seule l'empreinte SHA-256 du jeton est stockée : une fuite de la base
 * ne permet pas de s'en servir. Tout changement de mot de passe incrémente la version de session du
 * compte, ce qui déconnecte les sessions ouvertes ailleurs (cf. getSession).
 */

export const LONGUEUR_MIN_MOT_DE_PASSE = 8;
// bcrypt ignore tout ce qui dépasse 72 octets : on refuse plutôt que de tronquer en silence.
export const LONGUEUR_MAX_MOT_DE_PASSE = 72;
const DUREE_VALIDITE_MS = 60 * 60 * 1000;

export const empreinte = (jeton: string) => crypto.createHash("sha256").update(jeton).digest("hex");

/** Message d'erreur si le mot de passe ne respecte pas les règles, sinon null. */
export function erreurMotDePasse(motDePasse: string, confirmation: string): string | null {
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) return `Le mot de passe doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`;
  if (Buffer.byteLength(motDePasse, "utf8") > LONGUEUR_MAX_MOT_DE_PASSE) return "Le mot de passe est trop long (72 caractères maximum).";
  if (motDePasse !== confirmation) return "Les deux mots de passe ne correspondent pas.";
  return null;
}

/**
 * Envoie un lien de réinitialisation si un compte existe pour cet e-mail. Ne dit jamais à
 * l'appelant si le compte existe (même réponse dans tous les cas, cf. l'action).
 */
export async function envoyerLienReinitialisation(email: string, origineSite: string): Promise<void> {
  const utilisateur = await prisma.user.findUnique({ where: { email }, select: { id: true, nom: true, email: true } });
  if (!utilisateur) return;

  const jeton = crypto.randomBytes(32).toString("base64url");
  await prisma.$transaction([
    // Un seul lien valable à la fois : une nouvelle demande annule les précédentes.
    prisma.jetonReinitialisation.deleteMany({ where: { userId: utilisateur.id, utiliseLe: null, nouvelEmail: null } }),
    prisma.jetonReinitialisation.create({
      data: { userId: utilisateur.id, empreinte: empreinte(jeton), expireLe: new Date(Date.now() + DUREE_VALIDITE_MS) },
    }),
  ]);

  const lien = `${origineSite}/mot-de-passe-oublie/nouveau?jeton=${jeton}`;
  await envoyerEmail(
    [utilisateur.email],
    "Réinitialisation de votre mot de passe TraceDon",
    `Bonjour ${utilisateur.nom},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure, utilisable une seule fois) :\n${lien}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail : votre mot de passe actuel reste valable.\n\nTraceDon`
  );
}

/** Le jeton est-il encore utilisable ? (pour afficher ou non le formulaire). */
export async function jetonValide(jeton: string): Promise<boolean> {
  if (!jeton) return false;
  const ligne = await prisma.jetonReinitialisation.findUnique({ where: { empreinte: empreinte(jeton) } });
  return !!ligne && !ligne.nouvelEmail && !ligne.utiliseLe && ligne.expireLe > new Date();
}

/** Remplace le mot de passe ; renvoie null si c'est fait, sinon le motif du refus. */
export async function reinitialiserMotDePasse(jeton: string, motDePasse: string, confirmation: string): Promise<string | null> {
  const erreur = erreurMotDePasse(motDePasse, confirmation);
  if (erreur) return erreur;

  const passwordHash = await hashPassword(motDePasse);
  const fait = await prisma.$transaction(async (tx) => {
    // Consommation conditionnelle : deux envois simultanés du même lien ne passent pas tous les deux.
    const ligne = await tx.jetonReinitialisation.findUnique({ where: { empreinte: empreinte(jeton) } });
    if (!ligne || ligne.nouvelEmail) return null;
    const { count } = await tx.jetonReinitialisation.updateMany({
      where: { id: ligne.id, utiliseLe: null, expireLe: { gt: new Date() } },
      data: { utiliseLe: new Date() },
    });
    if (count === 0) return null;
    return tx.user.update({
      where: { id: ligne.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
      select: { email: true, nom: true },
    });
  });
  if (!fait) return "Ce lien n'est plus valable (déjà utilisé ou expiré). Faites une nouvelle demande.";

  await avertirChangementMotDePasse(fait.email, fait.nom);
  return null;
}

/** Prévient le titulaire du compte : s'il n'est pas à l'origine du changement, il le saura. */
export async function avertirChangementMotDePasse(email: string, nom: string): Promise<void> {
  await envoyerEmail(
    [email],
    "Votre mot de passe TraceDon a été modifié",
    `Bonjour ${nom},\n\nLe mot de passe de votre compte TraceDon vient d'être modifié, et vos autres sessions ont été déconnectées.\n\nSi vous n'êtes pas à l'origine de ce changement, utilisez tout de suite « Mot de passe oublié » sur la page de connexion, puis prévenez le coordinateur TraceDon.\n\nTraceDon`
  );
}
