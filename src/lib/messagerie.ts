import "server-only";
import { prisma } from "@/lib/prisma";
import type { Role, SessionPayload } from "@/lib/auth";

export const TAILLE_MAX_PIECE_JOINTE_OCTETS = 5 * 1024 * 1024;
export const LONGUEUR_MAX_MESSAGE = 4000;

/**
 * Formats acceptés pour une pièce jointe : restreint aux types qui ne s'exécutent jamais
 * comme du contenu actif dans un navigateur (cf. src/lib/documents.ts, même contrainte).
 */
const TYPES_MIME_AUTORISES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function validerPieceJointe(fichier: File): { ok: true } | { ok: false; error: string } {
  if (fichier.size > TAILLE_MAX_PIECE_JOINTE_OCTETS) {
    return { ok: false, error: "Pièce jointe trop volumineuse (5 Mo maximum)." };
  }
  if (!TYPES_MIME_AUTORISES.has(fichier.type)) {
    return { ok: false, error: "Format non accepté : seuls les PDF et images (JPEG, PNG, WebP) sont autorisés." };
  }
  return { ok: true };
}

export const LABEL_PRIORITE: Record<string, string> = {
  NORMALE: "Normal",
  IMPORTANTE: "Important",
  URGENTE: "Urgent",
};

type ConversationOwners = { entrepriseId: string | null; associationId: string | null; avecCoordinateur: boolean };

/** Vrai si la session est un participant légitime de cette conversation. */
export function estParticipantConversation(session: SessionPayload, conversation: ConversationOwners): boolean {
  if (session.role === "COORDINATEUR") return conversation.avecCoordinateur;
  if (session.role === "ENTREPRISE") return conversation.entrepriseId === session.entrepriseId;
  if (session.role === "ASSOCIATION") return conversation.associationId === session.associationId;
  return false;
}

export function champLectureRole(role: Role): "luParEntrepriseLe" | "luParAssociationLe" | "luParCoordinateurLe" {
  if (role === "ENTREPRISE") return "luParEntrepriseLe";
  if (role === "ASSOCIATION") return "luParAssociationLe";
  return "luParCoordinateurLe";
}

export async function obtenirOuCreerConversationPartenaire(entrepriseId: string, associationId: string) {
  const existante = await prisma.conversation.findFirst({
    where: { entrepriseId, associationId, avecCoordinateur: false },
  });
  if (existante) return existante;
  return prisma.conversation.create({ data: { entrepriseId, associationId, avecCoordinateur: false } });
}

export async function obtenirOuCreerConversationCoordinateur(
  proprietaire: { entrepriseId: string } | { associationId: string }
) {
  const where = "entrepriseId" in proprietaire ? { entrepriseId: proprietaire.entrepriseId } : { associationId: proprietaire.associationId };
  const existante = await prisma.conversation.findFirst({ where: { ...where, avecCoordinateur: true } });
  if (existante) return existante;
  return prisma.conversation.create({ data: { ...proprietaire, avecCoordinateur: true } });
}

/** Nombre total de messages non lus, toutes conversations confondues, pour le badge de l'onglet Messages. */
export async function compterMessagesNonLus(session: SessionPayload): Promise<number> {
  const where =
    session.role === "ENTREPRISE"
      ? { entrepriseId: session.entrepriseId! }
      : session.role === "ASSOCIATION"
        ? { associationId: session.associationId! }
        : { avecCoordinateur: true };

  const champLecture = champLectureRole(session.role);
  const conversations = await prisma.conversation.findMany({
    where,
    select: { id: true, luParEntrepriseLe: true, luParAssociationLe: true, luParCoordinateurLe: true },
  });

  const comptes = await Promise.all(
    conversations.map((c) => {
      const luLe = c[champLecture];
      return prisma.message.count({
        where: {
          conversationId: c.id,
          expediteurId: { not: session.userId },
          createdAt: luLe ? { gt: luLe } : undefined,
        },
      });
    })
  );
  return comptes.reduce((total, n) => total + n, 0);
}
