"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rechercherProduitParCodeBarre, type ProduitScanne } from "@/lib/openFoodFacts";
import { jourSemaineDuJour } from "@/lib/planning";
import { conventionEstSignee, obtenirOuCreerConvention } from "@/lib/convention";
import { associationHabilitee, estGrandeSurface } from "@/lib/conformite";
import { formaterDateConges, periodeCongesActive } from "@/lib/conges";
import { validerPhotoArticle } from "@/lib/articlePhoto";
import { nomFichierSur, validerFichierDocument } from "@/lib/documents";
import { champTropLong } from "@/lib/validation";

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

/**
 * Une fois le bon d'enlèvement confirmé (signé par les deux parties), la liste des articles
 * est le registre légal de ce qui a été remis : elle ne doit plus pouvoir être modifiée, même
 * par l'entreprise propriétaire du don.
 */
function assurerBonNonConfirme(bon: { confirme: boolean } | null | undefined) {
  if (bon?.confirme) {
    throw new Error("Le bon d'enlèvement est déjà confirmé : les articles ne peuvent plus être modifiés.");
  }
}

async function assurerDonModifiable(donId: string) {
  const bon = await prisma.bonEnlevement.findUnique({ where: { donId }, select: { confirme: true } });
  assurerBonNonConfirme(bon);
}

export async function ajouterArticleManuel(donId: string, designation: string, poidsBrut: string, uniteBrut: string) {
  const session = await requireSession();
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");
  await assurerDonModifiable(donId);

  const poidsKg = Number(poidsBrut.replace(",", "."));
  if (!designation.trim() || Number.isNaN(poidsKg) || poidsKg <= 0) {
    return { ok: false, error: "Désignation ou poids invalide." };
  }
  if (champTropLong(designation)) {
    return { ok: false, error: "Désignation trop longue." };
  }

  // La quantité en unités est optionnelle : sans elle, l'article est déclaré au poids (vrac).
  const uniteSaisie = uniteBrut.trim();
  let quantiteDeclaree = "Vrac";
  if (uniteSaisie) {
    const unites = Number(uniteSaisie.replace(",", "."));
    if (Number.isNaN(unites) || unites <= 0) {
      return { ok: false, error: "Quantité invalide." };
    }
    quantiteDeclaree = `${unites} unité(s)`;
  }

  const article = await prisma.article.create({
    data: { donId, designation: designation.trim(), quantiteDeclaree, poidsKg },
  });
  revalidatePath("/");
  return { ok: true, id: article.id, quantiteDeclaree };
}

/**
 * Ajout d'un article de don matériel (invendus non alimentaires, loi AGEC art. 35) : pas de
 * poids fiable à saisir (pas de pesée systématique comme pour l'alimentaire), donc poidsKg
 * reste à 0 pour l'instant — la quantité et la description font foi. Photo optionnelle.
 */
export async function ajouterArticleMateriel(formData: FormData) {
  const session = await requireSession();
  const donId = String(formData.get("donId") ?? "");
  const designation = String(formData.get("designation") ?? "").trim();
  const quantiteDeclareeBrute = String(formData.get("quantiteDeclaree") ?? "").trim();
  const codeBarres = String(formData.get("codeBarres") ?? "").trim();

  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");
  await assurerDonModifiable(donId);

  if (!designation) {
    return { ok: false, error: "Merci de décrire le don (description obligatoire)." };
  }
  if (designation.length > 2000) {
    return { ok: false, error: "Description trop longue (2000 caractères maximum)." };
  }
  const quantiteDeclaree = quantiteDeclareeBrute || "1";

  let photo: { photoNomFichier: string; photoContentType: string; photoContenu: Buffer } | null = null;
  const fichier = formData.get("photo");
  if (fichier instanceof File && fichier.size > 0) {
    const validation = validerPhotoArticle(fichier);
    if (!validation.ok) return { ok: false, error: validation.error };
    photo = {
      photoNomFichier: nomFichierSur(fichier.name),
      photoContentType: fichier.type,
      photoContenu: Buffer.from(new Uint8Array(await fichier.arrayBuffer())),
    };
  }

  const article = await prisma.article.create({
    data: {
      donId,
      designation,
      quantiteDeclaree,
      poidsKg: 0,
      codeBarres: codeBarres || null,
      photoNomFichier: photo?.photoNomFichier,
      photoContentType: photo?.photoContentType,
      photoContenu: photo?.photoContenu as unknown as never,
    },
  });
  revalidatePath("/");
  return { ok: true, id: article.id, quantiteDeclaree };
}

export async function definirDetailsDonMaterielAction(donId: string, divisible: boolean, instructionsAcces: string) {
  const session = await requireSession();
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");
  await assurerDonModifiable(donId);

  const instructionsNettoyees = instructionsAcces.trim().slice(0, 2000);
  await prisma.don.update({
    where: { id: donId },
    data: { divisible, instructionsAcces: instructionsNettoyees || null },
  });
  revalidatePath("/nouveau-don-materiel");
}

/**
 * Titre/description du lot, adresse de récupération et détails logistiques d'un don (initialement
 * pour l'alimentaire, mais générique — cf. commentaire du modèle Don).
 */
export async function definirDetailsLotAction(
  donId: string,
  titre: string,
  description: string,
  adresseRecuperation: string,
  instructionsAcces: string
) {
  const session = await requireSession();
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");
  await assurerDonModifiable(donId);

  if (champTropLong(titre) || champTropLong(description, 2000) || champTropLong(adresseRecuperation, 300) || champTropLong(instructionsAcces, 2000)) {
    throw new Error("Un des champs dépasse la longueur maximale autorisée.");
  }

  await prisma.don.update({
    where: { id: donId },
    data: {
      titre: titre.trim() || null,
      description: description.trim() || null,
      adresseRecuperation: adresseRecuperation.trim() || null,
      instructionsAcces: instructionsAcces.trim() || null,
    },
  });
  revalidatePath("/");
}

export async function televerserPieceJointeDonAction(formData: FormData) {
  const session = await requireSession();
  const donId = String(formData.get("donId") ?? "");
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");
  await assurerDonModifiable(donId);

  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { ok: false, error: "Aucun fichier reçu." };
  }
  const validation = validerFichierDocument(fichier);
  if (!validation.ok) return { ok: false, error: validation.error };

  await prisma.don.update({
    where: { id: donId },
    data: {
      pieceJointeNomFichier: nomFichierSur(fichier.name),
      pieceJointeContentType: fichier.type,
      pieceJointeContenu: Buffer.from(new Uint8Array(await fichier.arrayBuffer())) as unknown as never,
    },
  });
  revalidatePath("/");
  return { ok: true };
}

export async function retirerPieceJointeDonAction(donId: string) {
  const session = await requireSession();
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");
  await assurerDonModifiable(donId);

  await prisma.don.update({
    where: { id: donId },
    data: { pieceJointeNomFichier: null, pieceJointeContentType: null, pieceJointeContenu: null },
  });
  revalidatePath("/");
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
  await assurerDonModifiable(donId);

  if (!designation.trim() || !Number.isFinite(poidsUnitaireKg) || poidsUnitaireKg <= 0 || !Number.isFinite(nombreUnites) || nombreUnites <= 0) {
    return { ok: false, error: "Poids unitaire ou nombre d'unités invalide." };
  }
  if (champTropLong(designation)) {
    return { ok: false, error: "Désignation trop longue." };
  }

  const poidsKg = poidsUnitaireKg * nombreUnites;
  const article = await prisma.article.create({
    data: {
      donId,
      codeBarres: codeBarres.trim() || null,
      designation: designation.trim(),
      quantiteDeclaree: `${nombreUnites} unité(s) × ${poidsUnitaireKg.toLocaleString("fr-FR")} kg`,
      poidsKg,
    },
  });
  revalidatePath("/");
  return { ok: true, id: article.id, poidsKg };
}

export async function retirerArticle(articleId: string) {
  const session = await requireSession();
  const article = await prisma.article.findUniqueOrThrow({
    where: { id: articleId },
    include: { don: { include: { bonEnlevement: { select: { confirme: true } } } } },
  });
  if (article.don.entrepriseId !== session.entrepriseId) throw new Error("Article non autorisé.");
  if (article.statut !== "EN_ATTENTE") {
    throw new Error("Cet article a déjà été contrôlé par l'association, il ne peut plus être retiré.");
  }
  assurerBonNonConfirme(article.don.bonEnlevement);
  await prisma.article.delete({ where: { id: articleId } });
  revalidatePath("/");
}

export async function publierDon(donId: string) {
  const session = await requireSession();
  if (session.role !== "ENTREPRISE" || !session.entrepriseId) throw new Error("Action réservée aux entreprises.");
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId }, include: { articles: true } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");

  // Le don matériel repose sur une liste établie à l'avance (pas de scan au moment de
  // l'enlèvement comme pour l'alimentaire) : elle doit donc être renseignée avant publication.
  if (don.type === "MATERIEL" && don.articles.length === 0) {
    return { ok: false as const, error: "Ajoutez au moins un article avant de publier ce don." };
  }

  const periodesConges = await prisma.periodeConges.findMany({ where: { entrepriseId: session.entrepriseId } });
  const congesEnCours = periodeCongesActive(periodesConges);
  if (congesEnCours) {
    return {
      ok: false as const,
      error: `Vous êtes en congés jusqu'au ${formaterDateConges(congesEnCours.fin)} : impossible de publier un don pendant cette période.`,
    };
  }

  const kbis = await prisma.document.findUnique({
    where: { entrepriseId_type: { entrepriseId: session.entrepriseId, type: "KBIS" } },
  });
  if (!kbis) {
    return {
      ok: false as const,
      error: "Votre extrait Kbis doit être déposé dans votre coffre-fort documentaire avant de publier un don.",
      manqueKbis: true,
    };
  }

  // Planning récurrent : si une seule association est attendue aujourd'hui, le don lui est
  // assigné directement (bon d'enlèvement créé tout de suite) plutôt que publié sur la
  // place de marché — cf. le fonctionnement réel des grandes surfaces (association fixe par jour).
  const assignationsAujourdhui = await prisma.assignationRecurrente.findMany({
    where: { entrepriseId: session.entrepriseId, jourSemaine: jourSemaineDuJour(new Date()), actif: true },
    include: { association: true },
  });

  let assigneA: string | null = null;

  if (assignationsAujourdhui.length === 1) {
    const association = assignationsAujourdhui[0].association;
    await prisma.don.update({
      where: { id: donId },
      data: { statut: "PRIS_EN_CHARGE", associationAssigneeId: association.id, publieLe: new Date() },
    });
    await prisma.bonEnlevement.create({
      data: {
        numero: await genererNumeroBon(),
        donId,
        entrepriseId: session.entrepriseId,
        associationId: association.id,
      },
    });
    assigneA = association.denomination;
  } else {
    await prisma.don.update({ where: { id: donId }, data: { statut: "PUBLIE", publieLe: new Date() } });
  }

  revalidatePath("/");
  revalidatePath("/dons");

  // Un nouveau brouillon vide, du même type, est immédiatement disponible pour le prochain don.
  const nouveauBrouillon = await prisma.don.create({
    data: { entrepriseId: session.entrepriseId, type: don.type },
    include: { articles: true },
  });
  return { ok: true as const, id: nouveauBrouillon.id, articles: nouveauBrouillon.articles, assigneA };
}

export async function sePositionner(
  donId: string,
  forcerMalgreAvertissement: boolean = false
): Promise<{ ok: true } | { ok: false; error: string; conventionId?: string; avertissementHabilitation?: boolean }> {
  const session = await requireSession();
  if (session.role !== "ASSOCIATION" || !session.associationId) throw new Error("Action réservée aux associations.");

  const donCible = await prisma.don.findUniqueOrThrow({ where: { id: donId } });

  const periodesCongesAssociation = await prisma.periodeConges.findMany({
    where: { associationId: session.associationId },
  });
  const congesEnCours = periodeCongesActive(periodesCongesAssociation);
  if (congesEnCours) {
    return {
      ok: false,
      error: `Votre association est en congés jusqu'au ${formaterDateConges(congesEnCours.fin)} : impossible de vous positionner sur un don pendant cette période.`,
    };
  }

  if (!(await conventionEstSignee(donCible.entrepriseId, session.associationId))) {
    const convention = await obtenirOuCreerConvention(donCible.entrepriseId, session.associationId);
    return {
      ok: false,
      error: "Une convention de don doit être signée avec cette entreprise avant de vous positionner.",
      conventionId: convention.id,
    };
  }

  if (!forcerMalgreAvertissement) {
    const [entreprise, association] = await Promise.all([
      prisma.entreprise.findUniqueOrThrow({ where: { id: donCible.entrepriseId } }),
      prisma.association.findUniqueOrThrow({ where: { id: session.associationId } }),
    ]);
    if (estGrandeSurface(entreprise.surfaceVenteM2) && !associationHabilitee(association.habilitationStatut)) {
      return {
        ok: false,
        avertissementHabilitation: true,
        error:
          "Ce commerce dépasse 400 m² de surface de vente : la loi Garot impose que ses invendus soient cédés à une association habilitée. Votre association n'est pas déclarée habilitée.",
      };
    }
  }

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
  return { ok: true };
}

async function requireControleAssociation(articleId: string) {
  const session = await requireSession();
  const article = await prisma.article.findUniqueOrThrow({
    where: { id: articleId },
    include: { don: { include: { bonEnlevement: { select: { confirme: true } } } } },
  });
  if (session.role !== "ASSOCIATION" || article.don.associationAssigneeId !== session.associationId) {
    throw new Error("Action réservée à l'association destinataire de ce don.");
  }
  assurerBonNonConfirme(article.don.bonEnlevement);
  return article;
}

export async function validerArticle(articleId: string) {
  const article = await requireControleAssociation(articleId);

  const periodesCongesAssociation = await prisma.periodeConges.findMany({
    where: { associationId: article.don.associationAssigneeId as string },
  });
  const congesEnCours = periodeCongesActive(periodesCongesAssociation);
  if (congesEnCours) {
    throw new Error(
      `Votre association est en congés jusqu'au ${formaterDateConges(congesEnCours.fin)} : la validation des dons est suspendue pendant cette période.`
    );
  }

  if (article.dlcDepassee) return; // le refus est obligatoire, cf. cahier des charges
  await prisma.article.update({ where: { id: articleId }, data: { statut: "VALIDE", motifRefus: null } });
  revalidatePath("/bon-enlevement");
}

export async function refuserArticle(articleId: string, motif: string) {
  await requireControleAssociation(articleId);
  await prisma.article.update({
    where: { id: articleId },
    data: { statut: "REFUSE", motifRefus: motif || null },
  });
  revalidatePath("/bon-enlevement");
}

export async function confirmerBon(bonId: string) {
  const session = await requireSession();
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({
    where: { id: bonId },
    include: { don: { include: { articles: true } } },
  });
  const autorise =
    (session.role === "ENTREPRISE" && bon.entrepriseId === session.entrepriseId) ||
    (session.role === "ASSOCIATION" && bon.associationId === session.associationId);
  if (!autorise) throw new Error("Bon non autorisé.");
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

  const don = await prisma.don.update({
    where: { id: donId },
    data: { statut: "PRIS_EN_CHARGE", associationAssigneeId: associationId },
  });

  const bonExistant = await prisma.bonEnlevement.findUnique({ where: { donId } });
  if (!bonExistant) {
    await prisma.bonEnlevement.create({
      data: { numero: await genererNumeroBon(), donId, entrepriseId: don.entrepriseId, associationId },
    });
  }

  revalidatePath("/coordinateur");
}
