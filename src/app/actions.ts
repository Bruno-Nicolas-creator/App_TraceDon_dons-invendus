"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rechercherProduitParCodeBarre, type ProduitScanne } from "@/lib/openFoodFacts";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Non authentifié.");
  return session;
}

async function genererNumeroBon(): Promise<string> {
  const total = await prisma.bonEnlevement.count();
  const annee = new Date().getFullYear();
  return `${annee}-${String(total + 1).padStart(4, "0")}`;
}

export async function ajouterArticleManuel(donId: string, designation: string, poidsBrut: string) {
  const session = await requireSession();
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");

  const poidsKg = Number(poidsBrut.replace(",", "."));
  if (!designation.trim() || Number.isNaN(poidsKg) || poidsKg <= 0) {
    return { ok: false, error: "Désignation ou poids invalide." };
  }
  await prisma.article.create({
    data: { donId, designation: designation.trim(), quantiteDeclaree: `${poidsBrut} kg`, poidsKg },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function rechercherProduitAction(codeBarre: string): Promise<ProduitScanne | null> {
  await requireSession();
  return rechercherProduitParCodeBarre(codeBarre);
}

export async function ajouterArticleScanne(
  donId: string,
  codeBarres: string,
  designation: string,
  poidsUnitaireKg: number,
  nombreUnites: number
) {
  const session = await requireSession();
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");

  if (!designation.trim() || !Number.isFinite(poidsUnitaireKg) || poidsUnitaireKg <= 0 || !Number.isFinite(nombreUnites) || nombreUnites <= 0) {
    return { ok: false, error: "Poids unitaire ou nombre d'unités invalide." };
  }

  const poidsKg = poidsUnitaireKg * nombreUnites;
  await prisma.article.create({
    data: {
      donId,
      codeBarres: codeBarres.trim() || null,
      designation: designation.trim(),
      quantiteDeclaree: `${nombreUnites} unité(s) × ${poidsUnitaireKg.toLocaleString("fr-FR")} kg`,
      poidsKg,
    },
  });
  revalidatePath("/");
  return { ok: true, poidsKg };
}

export async function retirerArticle(articleId: string) {
  const session = await requireSession();
  const article = await prisma.article.findUniqueOrThrow({ where: { id: articleId }, include: { don: true } });
  if (article.don.entrepriseId !== session.entrepriseId) throw new Error("Article non autorisé.");
  await prisma.article.delete({ where: { id: articleId } });
  revalidatePath("/");
}

export async function changerModeDon(donId: string, mode: "LISTE_PREALABLE" | "BORDEREAU_OUVERT") {
  const session = await requireSession();
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");
  await prisma.don.update({ where: { id: donId }, data: { mode } });
  revalidatePath("/");
}

export async function publierDon(donId: string) {
  const session = await requireSession();
  if (session.role !== "ENTREPRISE" || !session.entrepriseId) throw new Error("Action réservée aux entreprises.");
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");

  await prisma.don.update({ where: { id: donId }, data: { statut: "PUBLIE", publieLe: new Date() } });
  revalidatePath("/");
  revalidatePath("/dons");

  // Un nouveau brouillon vide est immédiatement disponible pour le prochain don.
  const nouveauBrouillon = await prisma.don.create({
    data: { entrepriseId: session.entrepriseId },
    include: { articles: true },
  });
  return { id: nouveauBrouillon.id, mode: nouveauBrouillon.mode, articles: nouveauBrouillon.articles };
}

export async function sePositionner(donId: string) {
  const session = await requireSession();
  if (session.role !== "ASSOCIATION" || !session.associationId) throw new Error("Action réservée aux associations.");

  const don = await prisma.don.update({
    where: { id: donId },
    data: { statut: "PRIS_EN_CHARGE", associationAssigneeId: session.associationId },
  });

  const bonExistant = await prisma.bonEnlevement.findUnique({ where: { donId } });
  if (!bonExistant) {
    await prisma.bonEnlevement.create({
      data: {
        numero: await genererNumeroBon(),
        donId,
        entrepriseId: don.entrepriseId,
        associationId: session.associationId,
      },
    });
  }
  revalidatePath("/dons");
}

export async function validerArticle(articleId: string) {
  await requireSession();
  const article = await prisma.article.findUniqueOrThrow({ where: { id: articleId } });
  if (article.dlcDepassee) return; // le refus est obligatoire, cf. cahier des charges
  await prisma.article.update({ where: { id: articleId }, data: { statut: "VALIDE", motifRefus: null } });
  revalidatePath("/bon-enlevement");
}

export async function refuserArticle(articleId: string, motif: string) {
  await requireSession();
  await prisma.article.update({
    where: { id: articleId },
    data: { statut: "REFUSE", motifRefus: motif || null },
  });
  revalidatePath("/bon-enlevement");
}

export async function confirmerBon(bonId: string) {
  await requireSession();
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({
    where: { id: bonId },
    include: { don: { include: { articles: true } } },
  });
  if (!bon.signatureDonateurLe || !bon.signatureAssociationLe) {
    return { ok: false, error: "Les deux signatures sont requises avant de confirmer l'enlèvement." };
  }
  const poidsTotalRetenu = bon.don.articles
    .filter((a) => a.statut === "VALIDE")
    .reduce((total, a) => total + a.poidsKg, 0);

  await prisma.$transaction([
    prisma.bonEnlevement.update({
      where: { id: bonId },
      data: { confirme: true, dateHeureEnlevement: new Date(), poidsTotalRetenu },
    }),
    prisma.don.update({ where: { id: bon.donId }, data: { statut: "CLOTURE" } }),
  ]);

  revalidatePath("/bon-enlevement");
  revalidatePath("/archives");
  return { ok: true };
}

export async function verifierAssociation(associationId: string, verifiee: boolean) {
  const session = await requireSession();
  if (session.role !== "COORDINATEUR") throw new Error("Action réservée au coordinateur.");
  await prisma.association.update({
    where: { id: associationId },
    data: { verifiee, verifieeLe: verifiee ? new Date() : null, verifieePar: verifiee ? session.nom : null },
  });
  revalidatePath("/coordinateur");
}

export async function assignerDon(donId: string, associationId: string) {
  const session = await requireSession();
  if (session.role !== "COORDINATEUR") throw new Error("Action réservée au coordinateur.");
  await prisma.don.update({
    where: { id: donId },
    data: { statut: "PRIS_EN_CHARGE", associationAssigneeId: associationId },
  });
  revalidatePath("/coordinateur");
}
