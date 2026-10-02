import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { tropDeLecturesDocument } from "@/lib/rateLimiter";
import MandatSignatureBenevoleDocument from "@/lib/pdf/MandatSignatureBenevoleDocument";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    return new NextResponse("Réservé aux associations.", { status: 403 });
  }
  if (await tropDeLecturesDocument(session.userId)) return new NextResponse("Trop de téléchargements, réessaie plus tard.", { status: 429 });

  const association = await prisma.association.findUniqueOrThrow({ where: { id: session.associationId } });

  const buffer = await renderToBuffer(
    <MandatSignatureBenevoleDocument
      data={{ denomination: association.denomination, rna: association.rna, adresse: association.adresse }}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="modele-mandat-signature-benevole.pdf"`,
    },
  });
}
