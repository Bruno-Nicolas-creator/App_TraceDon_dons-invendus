import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { estAutoriseSurRessource, getSession } from "@/lib/auth";
import BonEnlevementDocument, { type ArticlePdf } from "@/lib/pdf/BonEnlevementDocument";

export async function GET(request: NextRequest, { params }: { params: Promise<{ bonId: string }> }) {
  const { bonId } = await params;

  const session = await getSession();
  if (!session) return new NextResponse("Non authentifié.", { status: 401 });

  const bon = await prisma.bonEnlevement.findUnique({
    where: { id: bonId },
    include: { entreprise: true, association: true, don: { include: { articles: { orderBy: { createdAt: "asc" } } } } },
  });
  if (!bon) return new NextResponse("Introuvable.", { status: 404 });

  if (!estAutoriseSurRessource(session, bon)) return new NextResponse("Non autorisé.", { status: 403 });

  const qrDataUrl = await QRCode.toDataURL(`${request.nextUrl.origin}/bon-enlevement/${bon.donId}`, {
    margin: 1,
    width: 200,
  });

  const articles: ArticlePdf[] = bon.don.articles.map((a) => ({
    designation: a.designation,
    quantite: a.quantiteConstatee ?? a.quantiteDeclaree,
    poidsKg: a.poidsKg,
    dlcOuEtat: a.dlcOuEtat,
    temperature: a.temperature,
    statut: a.statut,
    motifRefus: a.motifRefus,
  }));

  const buffer = await renderToBuffer(
    <BonEnlevementDocument
      data={{
        numero: bon.numero,
        entreprise: { raisonSociale: bon.entreprise.raisonSociale, adresse: bon.entreprise.adresse, siret: bon.entreprise.siret },
        association: { denomination: bon.association.denomination, adresse: bon.association.adresse, rna: bon.association.rna },
        dateHeureEnlevement: bon.dateHeureEnlevement,
        poidsTotalRetenu: bon.poidsTotalRetenu,
        articles,
        signatureDonateurLe: bon.signatureDonateurLe,
        signatureAssociationLe: bon.signatureAssociationLe,
        qrDataUrl,
      }}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="bon-enlevement-${bon.numero}.pdf"`,
    },
  });
}
