import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estAutoriseSurRessource, getSession } from "@/lib/auth";
import { genererPdfConvention } from "@/lib/docusign";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ conventionId: string }> }) {
  const { conventionId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });

  const convention = await prisma.convention.findUnique({ where: { id: conventionId } });
  if (!convention) return new NextResponse("Introuvable.", { status: 404 });

  if (!estAutoriseSurRessource(session, convention)) return new NextResponse("Non autorisé.", { status: 403 });

  const buffer = await genererPdfConvention(conventionId);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="convention-${conventionId}.pdf"`,
    },
  });
}
