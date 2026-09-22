import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) return new NextResponse("Introuvable.", { status: 404 });

  const autorise =
    session.role === "COORDINATEUR" ||
    (session.role === "ENTREPRISE" && session.entrepriseId === document.entrepriseId) ||
    (session.role === "ASSOCIATION" && session.associationId === document.associationId);
  if (!autorise) return new NextResponse("Non autorisé.", { status: 403 });

  return new NextResponse(new Uint8Array(document.contenu), {
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `inline; filename="${document.nomFichier}"`,
    },
  });
}
