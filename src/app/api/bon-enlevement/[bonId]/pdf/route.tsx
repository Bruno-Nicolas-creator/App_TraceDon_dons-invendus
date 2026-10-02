import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estAutoriseSurRessource, getSession } from "@/lib/auth";
import { genererPdfBon } from "@/lib/docusign";
import { tropDeLecturesDocument } from "@/lib/rateLimiter";

export async function GET(request: NextRequest, { params }: { params: Promise<{ bonId: string }> }) {
  const { bonId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });
  if (await tropDeLecturesDocument(session.userId)) return new NextResponse("Trop de téléchargements, réessaie plus tard.", { status: 429 });

  const bon = await prisma.bonEnlevement.findUnique({ where: { id: bonId } });
  if (!bon) return new NextResponse("Introuvable.", { status: 404 });

  if (!estAutoriseSurRessource(session, bon)) return new NextResponse("Non autorisé.", { status: 403 });

  const buffer = await genererPdfBon(bonId, request.nextUrl.origin);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bon-enlevement-${bon.numero}.pdf"`,
    },
  });
}
