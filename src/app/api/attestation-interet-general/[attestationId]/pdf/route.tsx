import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estAutoriseSurRessource, getSession } from "@/lib/auth";
import { genererPdfInteretGeneral } from "@/lib/docusign";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ attestationId: string }> }) {
  const { attestationId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });

  const attestation = await prisma.attestationInteretGeneral.findUnique({ where: { id: attestationId } });
  if (!attestation) return new NextResponse("Introuvable.", { status: 404 });

  if (!estAutoriseSurRessource(session, attestation)) return new NextResponse("Non autorisé.", { status: 403 });

  const buffer = await genererPdfInteretGeneral(attestationId);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="attestation-interet-general-${attestation.id}.pdf"`,
    },
  });
}
