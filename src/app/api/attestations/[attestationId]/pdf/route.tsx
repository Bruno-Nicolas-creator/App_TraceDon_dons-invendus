import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { montantEnLettres } from "@/lib/nombreEnLettres";
import AttestationFiscaleDocument from "@/lib/pdf/AttestationFiscaleDocument";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ attestationId: string }> }) {
  const { attestationId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });

  const attestation = await prisma.attestationFiscale.findUnique({
    where: { id: attestationId },
    include: { entreprise: true, association: true, bonsEnlevement: { orderBy: { dateHeureEnlevement: "asc" } } },
  });
  if (!attestation) return new NextResponse("Introuvable.", { status: 404 });

  const autorise =
    session.role === "COORDINATEUR" ||
    (session.role === "ENTREPRISE" && session.entrepriseId === attestation.entrepriseId) ||
    (session.role === "ASSOCIATION" && session.associationId === attestation.associationId);
  if (!autorise) return new NextResponse("Non autorisé.", { status: 403 });

  const buffer = await renderToBuffer(
    <AttestationFiscaleDocument
      data={{
        numeroOrdre: attestation.numeroOrdre,
        entreprise: {
          raisonSociale: attestation.entreprise.raisonSociale,
          formeJuridique: attestation.entreprise.formeJuridique,
          adresse: attestation.entreprise.adresse,
          siret: attestation.entreprise.siret,
        },
        association: {
          denomination: attestation.association.denomination,
          adresse: attestation.association.adresse,
          rna: attestation.association.rna,
          categorieEligibilite: attestation.association.categorieEligibilite,
          declarationInteretGeneral: attestation.association.declarationInteretGeneral,
          rescritStatut: attestation.association.rescritStatut,
          rescritDateDepot: attestation.association.rescritDateDepot,
        },
        periodeDebut: attestation.periodeDebut,
        periodeFin: attestation.periodeFin,
        montantCalcule: attestation.montantCalcule,
        bons: attestation.bonsEnlevement.map((b) => ({
          numero: b.numero,
          date: b.dateHeureEnlevement,
          poids: b.poidsTotalRetenu ?? 0,
        })),
      }}
      montantEnLettres={montantEnLettres(attestation.montantCalcule)}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="attestation-${attestation.numeroOrdre}.pdf"`,
    },
  });
}
