import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { champLectureRole, estParticipantConversation } from "@/lib/messagerie";
import ConversationClient, { type MessageAffiche } from "./ConversationClient";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;

  const session = await getSession();
  if (!session) redirect("/connexion");

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      entreprise: true,
      association: true,
      messages: { orderBy: { createdAt: "asc" }, include: { expediteur: true } },
    },
  });
  if (!conversation) notFound();
  if (!estParticipantConversation(session, conversation)) notFound();

  // On ouvre le fil : on marque immédiatement son propre côté comme lu.
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { [champLectureRole(session.role)]: new Date() },
  });

  const estMonMessage = (expediteur: { role: string; entrepriseId: string | null; associationId: string | null }) => {
    if (session.role === "COORDINATEUR") return expediteur.role === "COORDINATEUR";
    if (session.role === "ENTREPRISE") return expediteur.entrepriseId === session.entrepriseId;
    return expediteur.associationId === session.associationId;
  };

  const messagesAffiches: MessageAffiche[] = conversation.messages.map((m) => ({
    id: m.id,
    contenu: m.contenu,
    priorite: m.priorite,
    expediteurNom: m.expediteur.nom,
    estMonMessage: estMonMessage(m.expediteur),
    createdAt: m.createdAt.toISOString(),
    pieceJointe: m.pieceJointeNomFichier
      ? { nom: m.pieceJointeNomFichier, contentType: m.pieceJointeContentType ?? "" }
      : null,
  }));

  let nom: string;
  if (session.role === "COORDINATEUR") {
    nom = conversation.entreprise?.raisonSociale ?? conversation.association?.denomination ?? "—";
  } else if (session.role === "ENTREPRISE") {
    nom = conversation.avecCoordinateur ? "Coordinateur" : (conversation.association?.denomination ?? "—");
  } else {
    nom = conversation.avecCoordinateur ? "Coordinateur" : (conversation.entreprise?.raisonSociale ?? "—");
  }

  return <ConversationClient conversationId={conversationId} nomPartenaire={nom} messages={messagesAffiches} />;
}
