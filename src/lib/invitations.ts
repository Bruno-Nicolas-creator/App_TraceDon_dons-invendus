import "server-only";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { envoyerEmail } from "@/lib/email";
import { notifier } from "@/lib/notifications";
import { empreinte, erreurMotDePasse } from "@/lib/reinitialisation";
import { libelleNiveau, type NiveauAcces } from "@/lib/droits";

/**
 * Invitations de collègues (chantier C4c, étape 2, 2026-10-11) : un administrateur invite une
 * adresse e-mail avec un niveau d'accès ; l'invité reçoit un lien valable 7 jours, à usage unique,
 * choisit son nom et son mot de passe, et rejoint l'organisation. Une adresse déjà inscrite sur
 * TraceDon est refusée (un compte = une organisation).
 */

const DUREE_VALIDITE_MS = 7 * 24 * 3600 * 1000;
const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Organisation = { entrepriseId: string | null; associationId: string | null };
export type Inviteur = { id: string; nom: string };

const filtreOrganisation = (org: Organisation) =>
  org.entrepriseId ? { entrepriseId: org.entrepriseId } : { associationId: org.associationId! };

async function nomOrganisation(org: Organisation): Promise<string> {
  if (org.entrepriseId) {
    return (await prisma.entreprise.findUniqueOrThrow({ where: { id: org.entrepriseId }, select: { raisonSociale: true } })).raisonSociale;
  }
  return (await prisma.association.findUniqueOrThrow({ where: { id: org.associationId! }, select: { denomination: true } })).denomination;
}

async function envoyerLien(email: string, niveau: NiveauAcces, org: Organisation, inviteur: Inviteur, origineSite: string) {
  const jeton = crypto.randomBytes(32).toString("base64url");
  const nom = await nomOrganisation(org);
  await prisma.invitation.create({
    data: {
      email,
      niveau,
      ...filtreOrganisation(org),
      empreinte: empreinte(jeton),
      expireLe: new Date(Date.now() + DUREE_VALIDITE_MS),
      inviteParId: inviteur.id,
      inviteParNom: inviteur.nom,
    },
  });
  await envoyerEmail(
    [email],
    `${nom} vous invite sur TraceDon`,
    `Bonjour,\n\n${inviteur.nom} vous invite à rejoindre ${nom} sur TraceDon, la plateforme de traçabilité des dons d'invendus, avec un accès « ${libelleNiveau(niveau)} ».\n\nPour accepter, ouvrez ce lien (valable 7 jours) et choisissez votre mot de passe :\n${origineSite}/invitation?jeton=${jeton}\n\nSi vous ne connaissez pas ${nom}, ignorez simplement cet e-mail.\n\nTraceDon`
  );
}

/** Invite une adresse ; renvoie null si l'invitation est partie, sinon le motif du refus. */
export async function inviterCollegue(
  org: Organisation,
  inviteur: Inviteur,
  emailBrut: string,
  niveau: NiveauAcces,
  origineSite: string
): Promise<string | null> {
  const email = emailBrut.trim().toLowerCase();
  if (!FORMAT_EMAIL.test(email) || email.length > 200) return "Adresse e-mail invalide.";
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return "Cette adresse a déjà un compte TraceDon. Un compte ne peut appartenir qu'à une seule organisation.";
  }
  // Une nouvelle invitation à la même adresse remplace la précédente.
  await prisma.invitation.updateMany({
    where: { ...filtreOrganisation(org), email, acceptee: null, annulee: null },
    data: { annulee: new Date() },
  });
  await envoyerLien(email, niveau, org, inviteur, origineSite);
  return null;
}

async function invitationEnAttente(org: Organisation, invitationId: string) {
  return prisma.invitation.findFirst({ where: { id: invitationId, ...filtreOrganisation(org), acceptee: null, annulee: null } });
}

export async function renvoyerInvitation(org: Organisation, invitationId: string, inviteur: Inviteur, origineSite: string): Promise<string | null> {
  const invitation = await invitationEnAttente(org, invitationId);
  if (!invitation) return "Invitation introuvable ou déjà utilisée.";
  return inviterCollegue(org, inviteur, invitation.email, invitation.niveau, origineSite);
}

export async function annulerInvitation(org: Organisation, invitationId: string): Promise<string | null> {
  const { count } = await prisma.invitation.updateMany({
    where: { id: invitationId, ...filtreOrganisation(org), acceptee: null, annulee: null },
    data: { annulee: new Date() },
  });
  return count === 0 ? "Invitation introuvable ou déjà utilisée." : null;
}

/** Invitation encore utilisable, pour afficher la page d'acceptation (null sinon). */
export async function lireInvitation(jeton: string) {
  if (!jeton) return null;
  const invitation = await prisma.invitation.findUnique({ where: { empreinte: empreinte(jeton) } });
  if (!invitation || invitation.acceptee || invitation.annulee || invitation.expireLe <= new Date()) return null;
  return { email: invitation.email, niveau: invitation.niveau, organisation: await nomOrganisation(invitation), inviteParNom: invitation.inviteParNom };
}

/** Crée le compte de l'invité ; renvoie le compte créé, ou le motif du refus. */
export async function accepterInvitation(jeton: string, nomBrut: string, motDePasse: string, confirmation: string) {
  const nom = nomBrut.trim();
  if (!nom || nom.length > 100) return { erreur: "Indiquez votre nom (100 caractères maximum)." };
  const erreur = erreurMotDePasse(motDePasse, confirmation);
  if (erreur) return { erreur };

  const passwordHash = await hashPassword(motDePasse);
  try {
    const utilisateur = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { empreinte: empreinte(jeton) } });
      if (!invitation) return null;
      // Consommation conditionnelle : un double clic ne crée pas deux comptes.
      const { count } = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptee: null, annulee: null, expireLe: { gt: new Date() } },
        data: { acceptee: new Date() },
      });
      if (count === 0) return null;
      return tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          nom,
          role: invitation.entrepriseId ? "ENTREPRISE" : "ASSOCIATION",
          entrepriseId: invitation.entrepriseId,
          associationId: invitation.associationId,
          niveauAcces: invitation.niveau,
        },
      });
    });
    if (!utilisateur) return { erreur: "Cette invitation n'est plus valable (déjà utilisée, annulée ou expirée). Demandez-en une nouvelle." };

    const org = { entrepriseId: utilisateur.entrepriseId, associationId: utilisateur.associationId };
    await notifier(
      { ...filtreOrganisation(org), niveauAcces: "ADMINISTRATEUR" } as { entrepriseId: string; niveauAcces: "ADMINISTRATEUR" },
      "Un collègue a rejoint votre organisation",
      `${nom} (${utilisateur.email}) a accepté votre invitation et a rejoint ${await nomOrganisation(org)} sur TraceDon avec un accès « ${libelleNiveau(utilisateur.niveauAcces)} ».`,
      "/profil"
    );
    return { utilisateur };
  } catch (e) {
    // Adresse inscrite entre l'invitation et son acceptation.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { erreur: "Cette adresse a désormais un compte TraceDon : connectez-vous avec, ou demandez une invitation pour une autre adresse." };
    }
    throw e;
  }
}
