import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { champLectureRole } from "@/lib/messagerie";
import MessagesClient, { type ConversationAffichee } from "./MessagesClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const where =
    session.role === "ENTREPRISE"
      ? { entrepriseId: session.entrepriseId! }
      : session.role === "ASSOCIATION"
        ? { associationId: session.associationId! }
        : { avecCoordinateur: true };

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      entreprise: true,
      association: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const champLecture = champLectureRole(session.role);

  const conversationsAffichees: ConversationAffichee[] = await Promise.all(
    conversations.map(async (c) => {
      const dernierMessage = c.messages[0] ?? null;
      const luLe = c[champLecture];

      const nombreNonLus = await prisma.message.count({
        where: {
          conversationId: c.id,
          expediteurId: { not: session.userId },
          createdAt: luLe ? { gt: luLe } : undefined,
        },
      });

      let nom: string;
      if (session.role === "COORDINATEUR") {
        nom = c.entreprise?.raisonSociale ?? c.association?.denomination ?? "—";
      } else if (session.role === "ENTREPRISE") {
        nom = c.avecCoordinateur ? "Coordinateur" : (c.association?.denomination ?? "—");
      } else {
        nom = c.avecCoordinateur ? "Coordinateur" : (c.entreprise?.raisonSociale ?? "—");
      }

      return {
        id: c.id,
        nom,
        dernierMessage: dernierMessage?.contenu ?? (dernierMessage?.pieceJointeNomFichier ? "📎 Pièce jointe" : ""),
        dernierMessageLe: dernierMessage?.createdAt.toISOString() ?? c.createdAt.toISOString(),
        prioriteDernierMessage: dernierMessage?.priorite ?? "NORMALE",
        nombreNonLus,
      };
    })
  );

  const nonLusMessages = conversationsAffichees.reduce((total, c) => total + c.nombreNonLus, 0);

  return <MessagesClient conversations={conversationsAffichees} role={session.role} nonLusMessages={nonLusMessages} />;
}
