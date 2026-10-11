"use server";

import { revalidatePath } from "next/cache";
import { getSessionOperateur as getSession } from "@/lib/sessionLimitee";
import { prisma } from "@/lib/prisma";
import { conventionEstSignee } from "@/lib/convention";
import { nomFichierSur } from "@/lib/documents";
import { champTropLong } from "@/lib/validation";
import { notifier } from "@/lib/notifications";
import { tropDeTentatives } from "@/lib/rateLimiter";
import {
  champLectureRole,
  estParticipantConversation,
  LONGUEUR_MAX_MESSAGE,
  obtenirOuCreerConversationCoordinateur,
  obtenirOuCreerConversationPartenaire,
  validerPieceJointe,
} from "@/lib/messagerie";

export async function demarrerConversationAction(
  cibleType: "ASSOCIATION" | "ENTREPRISE" | "COORDINATEUR",
  cibleId?: string
): Promise<{ ok: true; conversationId: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };

  try {
    if (cibleType === "COORDINATEUR") {
      if (session.role === "ENTREPRISE" && session.entrepriseId) {
        const conversation = await obtenirOuCreerConversationCoordinateur({ entrepriseId: session.entrepriseId });
        return { ok: true, conversationId: conversation.id };
      }
      if (session.role === "ASSOCIATION" && session.associationId) {
        const conversation = await obtenirOuCreerConversationCoordinateur({ associationId: session.associationId });
        return { ok: true, conversationId: conversation.id };
      }
      return { ok: false, error: "Action réservée aux entreprises et associations." };
    }

    if (!cibleId) return { ok: false, error: "Destinataire manquant." };

    if (cibleType === "ASSOCIATION") {
      if (session.role === "ENTREPRISE" && session.entrepriseId) {
        if (!(await conventionEstSignee(session.entrepriseId, cibleId))) {
          return { ok: false, error: "Une convention doit être signée avec cette association avant de lui écrire." };
        }
        const conversation = await obtenirOuCreerConversationPartenaire(session.entrepriseId, cibleId);
        return { ok: true, conversationId: conversation.id };
      }
      if (session.role === "COORDINATEUR") {
        const conversation = await obtenirOuCreerConversationCoordinateur({ associationId: cibleId });
        return { ok: true, conversationId: conversation.id };
      }
      return { ok: false, error: "Action non autorisée." };
    }

    if (cibleType === "ENTREPRISE") {
      if (session.role === "ASSOCIATION" && session.associationId) {
        if (!(await conventionEstSignee(cibleId, session.associationId))) {
          return { ok: false, error: "Une convention doit être signée avec cette entreprise avant de lui écrire." };
        }
        const conversation = await obtenirOuCreerConversationPartenaire(cibleId, session.associationId);
        return { ok: true, conversationId: conversation.id };
      }
      if (session.role === "COORDINATEUR") {
        const conversation = await obtenirOuCreerConversationCoordinateur({ entrepriseId: cibleId });
        return { ok: true, conversationId: conversation.id };
      }
      return { ok: false, error: "Action non autorisée." };
    }

    return { ok: false, error: "Destinataire invalide." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}

const MAX_MESSAGES = 20;
const FENETRE_MESSAGES_MS = 5 * 60 * 1000;

export async function envoyerMessageAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };
  if (await tropDeTentatives(`message:${session.userId}`, MAX_MESSAGES, FENETRE_MESSAGES_MS)) {
    return { ok: false, error: "Trop de messages envoyés en peu de temps, merci de patienter quelques minutes." };
  }

  const conversationId = String(formData.get("conversationId") ?? "");
  const contenu = String(formData.get("contenu") ?? "").trim();
  const prioriteBrute = String(formData.get("priorite") ?? "NORMALE");
  const priorite = (["NORMALE", "IMPORTANTE", "URGENTE"] as const).includes(prioriteBrute as never)
    ? (prioriteBrute as "NORMALE" | "IMPORTANTE" | "URGENTE")
    : "NORMALE";
  const fichier = formData.get("fichier");
  const aUneFichier = fichier instanceof File && fichier.size > 0;

  if (!contenu && !aUneFichier) return { ok: false, error: "Message vide." };
  if (champTropLong(contenu, LONGUEUR_MAX_MESSAGE)) return { ok: false, error: "Message trop long." };

  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return { ok: false, error: "Conversation introuvable." };
  if (!estParticipantConversation(session, conversation)) {
    return { ok: false, error: "Vous ne participez pas à cette conversation." };
  }

  let pieceJointe: {
    pieceJointeNomFichier: string;
    pieceJointeContentType: string;
    pieceJointeContenu: Buffer;
    pieceJointeTailleOctets: number;
  } | null = null;

  if (aUneFichier) {
    const validation = validerPieceJointe(fichier);
    if (!validation.ok) return validation;
    pieceJointe = {
      pieceJointeNomFichier: nomFichierSur(fichier.name),
      pieceJointeContentType: fichier.type,
      pieceJointeContenu: Buffer.from(new Uint8Array(await fichier.arrayBuffer())),
      pieceJointeTailleOctets: fichier.size,
    };
  }

  const maintenant = new Date();
  const champLecture = champLectureRole(session.role);

  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        expediteurId: session.userId,
        contenu: contenu || null,
        priorite,
        pieceJointeNomFichier: pieceJointe?.pieceJointeNomFichier,
        pieceJointeContentType: pieceJointe?.pieceJointeContentType,
        pieceJointeContenu: pieceJointe?.pieceJointeContenu as unknown as never,
        pieceJointeTailleOctets: pieceJointe?.pieceJointeTailleOctets,
      },
    }),
    // L'expéditeur voit forcément son propre message : on marque son côté comme lu.
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: maintenant, [champLecture]: maintenant },
    }),
  ]);

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");

  const destinataire =
    session.role === "COORDINATEUR"
      ? conversation.entrepriseId
        ? { entrepriseId: conversation.entrepriseId }
        : { associationId: conversation.associationId! }
      : conversation.avecCoordinateur
        ? ({ coordinateur: true } as const)
        : session.role === "ENTREPRISE"
          ? { associationId: conversation.associationId! }
          : { entrepriseId: conversation.entrepriseId! };
  await notifier(
    destinataire,
    "Nouveau message",
    `${session.nom} vous a envoyé un nouveau message${aUneFichier ? " (avec une pièce jointe)" : ""}${contenu ? ` :\n\n« ${contenu} »` : "."}`,
    `/messages/${conversationId}`
  );

  return { ok: true };
}
