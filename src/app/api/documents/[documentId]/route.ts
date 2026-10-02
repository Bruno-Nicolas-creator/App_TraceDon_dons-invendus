import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { nomFichierSur } from "@/lib/documents";
import { tropDeLecturesDocument } from "@/lib/rateLimiter";

const TYPES_MIME_SURS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });
  if (await tropDeLecturesDocument(session.userId)) return new NextResponse("Trop de téléchargements, réessaie plus tard.", { status: 429 });

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) return new NextResponse("Introuvable.", { status: 404 });

  const autorise =
    session.role === "COORDINATEUR" ||
    (session.role === "ENTREPRISE" && session.entrepriseId === document.entrepriseId) ||
    (session.role === "ASSOCIATION" && session.associationId === document.associationId);
  if (!autorise) return new NextResponse("Non autorisé.", { status: 403 });

  // Défense en profondeur : même si le type et le nom sont déjà validés au dépôt, on ne fait
  // jamais confiance aux données déjà stockées pour décider comment le navigateur doit les traiter.
  const sur = TYPES_MIME_SURS.has(document.contentType);
  const nomSur = nomFichierSur(document.nomFichier);

  return new NextResponse(new Uint8Array(document.contenu), {
    headers: {
      "Content-Type": sur ? document.contentType : "application/octet-stream",
      "Content-Disposition": `${sur ? "inline" : "attachment"}; filename="${nomSur}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
