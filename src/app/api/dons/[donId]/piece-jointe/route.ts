import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, estAutoriseSurRessource } from "@/lib/auth";
import { nomFichierSur } from "@/lib/documents";
import { tropDeLecturesDocument } from "@/lib/rateLimiter";

const TYPES_MIME_SURS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ donId: string }> }) {
  const { donId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });
  if (await tropDeLecturesDocument(session.userId)) return new NextResponse("Trop de téléchargements, réessaie plus tard.", { status: 429 });

  const don = await prisma.don.findUnique({ where: { id: donId } });
  if (!don || !don.pieceJointeContenu) return new NextResponse("Introuvable.", { status: 404 });

  const autorise =
    session.role === "COORDINATEUR" ||
    (session.role === "ENTREPRISE" && session.entrepriseId === don.entrepriseId) ||
    (don.associationAssigneeId != null &&
      estAutoriseSurRessource(session, { entrepriseId: don.entrepriseId, associationId: don.associationAssigneeId }));
  if (!autorise) return new NextResponse("Non autorisé.", { status: 403 });

  const contentType = don.pieceJointeContentType ?? "";
  const sur = TYPES_MIME_SURS.has(contentType);
  const nomSur = nomFichierSur(don.pieceJointeNomFichier ?? "piece-jointe");

  return new NextResponse(new Uint8Array(don.pieceJointeContenu), {
    headers: {
      "Content-Type": sur ? contentType : "application/octet-stream",
      "Content-Disposition": `${sur ? "inline" : "attachment"}; filename="${nomSur}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
