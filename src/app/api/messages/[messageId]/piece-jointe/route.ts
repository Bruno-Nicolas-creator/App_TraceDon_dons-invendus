import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { nomFichierSur } from "@/lib/documents";
import { estParticipantConversation } from "@/lib/messagerie";

const TYPES_MIME_SURS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });

  const message = await prisma.message.findUnique({ where: { id: messageId }, include: { conversation: true } });
  if (!message || !message.pieceJointeContenu) return new NextResponse("Introuvable.", { status: 404 });

  if (!estParticipantConversation(session, message.conversation)) {
    return new NextResponse("Non autorisé.", { status: 403 });
  }

  const contentType = message.pieceJointeContentType ?? "";
  const sur = TYPES_MIME_SURS.has(contentType);
  const nomSur = nomFichierSur(message.pieceJointeNomFichier ?? "piece-jointe");

  return new NextResponse(new Uint8Array(message.pieceJointeContenu), {
    headers: {
      "Content-Type": sur ? contentType : "application/octet-stream",
      "Content-Disposition": `${sur ? "inline" : "attachment"}; filename="${nomSur}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
