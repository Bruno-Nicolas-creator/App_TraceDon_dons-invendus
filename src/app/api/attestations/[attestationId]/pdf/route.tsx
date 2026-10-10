import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estAutoriseSurRessource, getSession } from "@/lib/auth";
import { genererPdfAttestation } from "@/lib/docusign";
import { tropDeLecturesDocument } from "@/lib/rateLimiter";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ attestationId: string }> }) {
  const { attestationId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });
  if (await tropDeLecturesDocument(session.userId)) return new NextResponse("Trop de téléchargements, réessaie plus tard.", { status: 429 });

  const attestation = await prisma.attestationFiscale.findUnique({ where: { id: attestationId } });
  if (!attestation) return new NextResponse("Introuvable.", { status: 404 });

  if (!estAutoriseSurRessource(session, attestation)) return new NextResponse("Non autorisé.", { status: 403 });
  if (!attestation.numeroOrdre) return new NextResponse("Ce reçu n'est pas encore émis par l'association.", { status: 404 });

  const buffer = await genererPdfAttestation(attestationId);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recu-fiscal-${attestation.numeroOrdre}.pdf"`,
    },
  });
}
