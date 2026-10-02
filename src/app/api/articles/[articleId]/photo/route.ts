import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, estAutoriseSurRessource } from "@/lib/auth";
import { nomFichierSur } from "@/lib/documents";
import { tropDeLecturesDocument } from "@/lib/rateLimiter";

const TYPES_MIME_SURS = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ articleId: string }> }) {
  const { articleId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });
  if (await tropDeLecturesDocument(session.userId)) return new NextResponse("Trop de téléchargements, réessaie plus tard.", { status: 429 });

  const article = await prisma.article.findUnique({ where: { id: articleId }, include: { don: true } });
  if (!article || !article.photoContenu) return new NextResponse("Introuvable.", { status: 404 });

  const autorise =
    session.role === "COORDINATEUR" ||
    (session.role === "ENTREPRISE" && session.entrepriseId === article.don.entrepriseId) ||
    (article.don.associationAssigneeId != null &&
      estAutoriseSurRessource(session, {
        entrepriseId: article.don.entrepriseId,
        associationId: article.don.associationAssigneeId,
      }));
  if (!autorise) return new NextResponse("Non autorisé.", { status: 403 });

  const contentType = article.photoContentType ?? "";
  const sur = TYPES_MIME_SURS.has(contentType);
  const nomSur = nomFichierSur(article.photoNomFichier ?? "photo");

  return new NextResponse(new Uint8Array(article.photoContenu), {
    headers: {
      "Content-Type": sur ? contentType : "application/octet-stream",
      "Content-Disposition": `${sur ? "inline" : "attachment"}; filename="${nomSur}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
