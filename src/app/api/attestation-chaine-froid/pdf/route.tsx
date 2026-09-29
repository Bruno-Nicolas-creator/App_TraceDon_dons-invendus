import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import AttestationChaineFroidDocument from "@/lib/pdf/AttestationChaineFroidDocument";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    return new NextResponse("Réservé aux associations.", { status: 403 });
  }

  const association = await prisma.association.findUniqueOrThrow({ where: { id: session.associationId } });

  const buffer = await renderToBuffer(
    <AttestationChaineFroidDocument
      data={{ denomination: association.denomination, rna: association.rna, adresse: association.adresse }}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="modele-attestation-chaine-froid.pdf"`,
    },
  });
}
