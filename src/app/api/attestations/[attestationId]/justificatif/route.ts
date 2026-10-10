import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estAutoriseSurRessource, getSession } from "@/lib/auth";
import { nomFichierSur } from "@/lib/documents";
import { tropDeLecturesDocument } from "@/lib/rateLimiter";

const TYPES_MIME_SURS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

/** Justificatif de valorisation joint par l'entreprise à sa demande de reçu fiscal. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ attestationId: string }> }) {
  const { attestationId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });
  if (await tropDeLecturesDocument(session.userId)) return new NextResponse("Trop de téléchargements, réessaie plus tard.", { status: 429 });

  const attestation = await prisma.attestationFiscale.findUnique({
    where: { id: attestationId },
    select: {
      entrepriseId: true,
      associationId: true,
      justificatifContenu: true,
      justificatifContentType: true,
      justificatifNomFichier: true,
    },
  });
  if (!attestation || !attestation.justificatifContenu) return new NextResponse("Introuvable.", { status: 404 });
  if (!estAutoriseSurRessource(session, attestation)) return new NextResponse("Non autorisé.", { status: 403 });

  const contentType = attestation.justificatifContentType ?? "";
  const sur = TYPES_MIME_SURS.has(contentType);
  const nomSur = nomFichierSur(attestation.justificatifNomFichier ?? "justificatif");

  return new NextResponse(new Uint8Array(attestation.justificatifContenu), {
    headers: {
      "Content-Type": sur ? contentType : "application/octet-stream",
      "Content-Disposition": `${sur ? "inline" : "attachment"}; filename="${nomSur}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
