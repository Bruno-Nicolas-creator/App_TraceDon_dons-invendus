"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionAdministrateur } from "@/lib/sessionLimitee";
import { niveauValide } from "@/lib/droits";
import { tropDeTentatives } from "@/lib/rateLimiter";
import { origineRequete } from "@/lib/requestOrigin";
import { annulerInvitation, inviterCollegue, renvoyerInvitation } from "@/lib/invitations";

type Resultat = { ok: true } | { ok: false; error: string };

/**
 * Gestion des membres d'une organisation par ses administrateurs (chantier C4c) : changer le niveau
 * d'un membre, lui retirer l'accès (désactivation, jamais suppression — décision de Bruno) ou le lui
 * rendre. Garde-fous : jamais sur soi-même, et jamais sans laisser au moins un administrateur actif.
 */
async function membreDeMonOrganisation(userId: string) {
  const session = await getSessionAdministrateur();
  if (!session || (session.role !== "ENTREPRISE" && session.role !== "ASSOCIATION")) return { erreur: "Action réservée aux entreprises et associations." };
  if (userId === session.userId) return { erreur: "Vous ne pouvez pas modifier votre propre accès." };
  const membre = await prisma.user.findUnique({ where: { id: userId } });
  const memeOrganisation =
    !!membre &&
    (session.role === "ENTREPRISE" ? membre.entrepriseId === session.entrepriseId : membre.associationId === session.associationId);
  if (!membre || !memeOrganisation) return { erreur: "Membre introuvable." };
  return { session, membre };
}

async function autreAdministrateurActif(membre: { id: string; entrepriseId: string | null; associationId: string | null }) {
  const n = await prisma.user.count({
    where: {
      id: { not: membre.id },
      niveauAcces: "ADMINISTRATEUR",
      desactiveLe: null,
      ...(membre.entrepriseId ? { entrepriseId: membre.entrepriseId } : { associationId: membre.associationId }),
    },
  });
  return n > 0;
}

export async function changerNiveauMembreAction(userId: string, niveau: string): Promise<Resultat> {
  const r = await membreDeMonOrganisation(userId);
  if ("erreur" in r) return { ok: false, error: r.erreur! };
  if (!niveauValide(niveau)) return { ok: false, error: "Niveau invalide." };
  if (r.membre.niveauAcces === "ADMINISTRATEUR" && niveau !== "ADMINISTRATEUR" && !(await autreAdministrateurActif(r.membre))) {
    return { ok: false, error: "Il doit rester au moins un administrateur actif." };
  }
  await prisma.user.update({ where: { id: userId }, data: { niveauAcces: niveau } });
  revalidatePath("/profil");
  return { ok: true };
}

export async function desactiverMembreAction(userId: string): Promise<Resultat> {
  const r = await membreDeMonOrganisation(userId);
  if ("erreur" in r) return { ok: false, error: r.erreur! };
  if (r.membre.desactiveLe) return { ok: true };
  if (r.membre.niveauAcces === "ADMINISTRATEUR" && !(await autreAdministrateurActif(r.membre))) {
    return { ok: false, error: "Il doit rester au moins un administrateur actif." };
  }
  // La version de session incrémentée coupe aussi immédiatement ses sessions ouvertes.
  await prisma.user.update({ where: { id: userId }, data: { desactiveLe: new Date(), sessionVersion: { increment: 1 } } });
  revalidatePath("/profil");
  return { ok: true };
}

export async function reactiverMembreAction(userId: string): Promise<Resultat> {
  const r = await membreDeMonOrganisation(userId);
  if ("erreur" in r) return { ok: false, error: r.erreur! };
  if (r.membre.desactiveLe) await prisma.user.update({ where: { id: userId }, data: { desactiveLe: null } });
  revalidatePath("/profil");
  return { ok: true };
}

// Chaque invitation envoie un e-mail : limite dédiée, pour qu'on ne puisse pas se servir de
// TraceDon pour écrire en masse à des inconnus.
const MAX_INVITATIONS = 20;
const FENETRE_INVITATIONS_MS = 60 * 60 * 1000;

async function administrateurDeSonOrganisation() {
  const session = await getSessionAdministrateur();
  if (!session || (session.role !== "ENTREPRISE" && session.role !== "ASSOCIATION")) return null;
  return session;
}

export async function inviterCollegueAction(
  _etat: Resultat | null,
  formData: FormData
): Promise<Resultat> {
  const session = await administrateurDeSonOrganisation();
  if (!session) return { ok: false, error: "Action réservée aux administrateurs d'une organisation." };
  const niveau = String(formData.get("niveau") ?? "");
  if (!niveauValide(niveau)) return { ok: false, error: "Niveau invalide." };
  if (await tropDeTentatives(`invitation:${session.userId}`, MAX_INVITATIONS, FENETRE_INVITATIONS_MS)) {
    return { ok: false, error: "Trop d'invitations envoyées en peu de temps. Merci de réessayer dans une heure." };
  }
  const erreur = await inviterCollegue(
    { entrepriseId: session.entrepriseId, associationId: session.associationId },
    { id: session.userId, nom: session.nom },
    String(formData.get("email") ?? ""),
    niveau,
    await origineRequete()
  );
  revalidatePath("/profil");
  return erreur ? { ok: false, error: erreur } : { ok: true };
}

export async function renvoyerInvitationAction(invitationId: string): Promise<Resultat> {
  const session = await administrateurDeSonOrganisation();
  if (!session) return { ok: false, error: "Action réservée aux administrateurs d'une organisation." };
  if (await tropDeTentatives(`invitation:${session.userId}`, MAX_INVITATIONS, FENETRE_INVITATIONS_MS)) {
    return { ok: false, error: "Trop d'invitations envoyées en peu de temps. Merci de réessayer dans une heure." };
  }
  const erreur = await renvoyerInvitation(
    { entrepriseId: session.entrepriseId, associationId: session.associationId },
    invitationId,
    { id: session.userId, nom: session.nom },
    await origineRequete()
  );
  revalidatePath("/profil");
  return erreur ? { ok: false, error: erreur } : { ok: true };
}

export async function annulerInvitationAction(invitationId: string): Promise<Resultat> {
  const session = await administrateurDeSonOrganisation();
  if (!session) return { ok: false, error: "Action réservée aux administrateurs d'une organisation." };
  const erreur = await annulerInvitation({ entrepriseId: session.entrepriseId, associationId: session.associationId }, invitationId);
  revalidatePath("/profil");
  return erreur ? { ok: false, error: erreur } : { ok: true };
}
