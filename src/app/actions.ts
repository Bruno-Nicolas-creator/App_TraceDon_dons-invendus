"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rechercherProduitParCodeBarre, type ProduitScanne } from "@/lib/openFoodFacts";
import { verifierRappel, type InfoRappel } from "@/lib/rappelConso";
import { jourSemaineDuJour } from "@/lib/planning";
import { conventionEstSignee, obtenirOuCreerConvention } from "@/lib/convention";
import { associationHabilitee, estGrandeSurface } from "@/lib/conformite";
import { formaterDateConges, periodeCongesActive } from "@/lib/conges";
import { validerPhotoArticle } from "@/lib/articlePhoto";
import { nomFichierSur, validerFichierDocument } from "@/lib/documents";
import { champTropLong } from "@/lib/validation";
import { extraireArticlesDepuisFichier } from "@/lib/extractionArticles";
import { TOUTES_CATEGORIES_DON } from "@/lib/categoriesDon";
import { articlesDuBon, articlesEntierementReclames } from "@/lib/donDivisible";
import { notifier } from "@/lib/notifications";

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
  // Un don peut désormais avoir plusieurs bons (un par association, pour un don matériel
  // divisible) : on bloque la modification dès que l'un d'eux est confirmé.
  const bonConfirme = await prisma.bonEnlevement.findFirst({ where: { donId, confirme: true }, select: { confirme: true } });
  assurerBonNonConfirme(bonConfirme);
}

export async function ajouterArticleManuel(
  donId: string,
  designation: string,
  poidsBrut: string,
  uniteBrut: string,
  categorie: string | null = null
) {
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
  const categorieValide = categorie && TOUTES_CATEGORIES_DON.some((c) => c.id === categorie) ? categorie : null;

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
    data: { donId, designation: designation.trim(), quantiteDeclaree, poidsKg, categorie: categorieValide },
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

export async function rechercherProduitAction(
  codeBarre: string
): Promise<{ produit: ProduitScanne | null; rappel: InfoRappel | null }> {
  await requireSession();
  const [produit, rappel] = await Promise.all([rechercherProduitParCodeBarre(codeBarre), verifierRappel(codeBarre)]);
  return { produit, rappel };
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
  // Deuxième vérification côté serveur (au cas où l'état de l'écran aurait été contourné) :
  // un produit sous rappel officiel actif ne peut jamais être ajouté à un don.
  const rappel = await verifierRappel(codeBarres);
  if (rappel) {
    return { ok: false, error: `Ce produit fait l'objet d'un rappel officiel (${rappel.motif}). Il ne peut pas être ajouté à un don.`, rappele: true };
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
    include: { don: { include: { bonsEnlevement: { select: { confirme: true } } } } },
  });
  if (article.don.entrepriseId !== session.entrepriseId) throw new Error("Article non autorisé.");
  if (article.statut !== "EN_ATTENTE") {
    throw new Error("Cet article a déjà été contrôlé par l'association, il ne peut plus être retiré.");
  }
  if (article.associationAssigneeId) {
    throw new Error("Cet article a déjà été réclamé par une association, il ne peut plus être retiré.");
  }
  if (article.don.bonsEnlevement.some((b) => b.confirme)) {
    throw new Error("Le bon d'enlèvement est déjà confirmé : les articles ne peuvent plus être modifiés.");
  }
  await prisma.article.delete({ where: { id: articleId } });
  revalidatePath("/");
}

/**
 * Extrait automatiquement les lignes d'articles (désignation, quantité, poids net) depuis la
 * pièce jointe du don via une IA de lecture d'image/document (cf. src/lib/extractionArticles.ts).
 * Ne renseigne que ces trois colonnes : DLC, température et contrôle restent à la charge de
 * l'association au moment de l'enlèvement.
 */
export async function extraireArticlesAction(
  donId: string
): Promise<{ ok: true; articles: { id: string; designation: string; quantiteDeclaree: string; poidsKg: number }[] } | { ok: false; error: string }> {
  const session = await requireSession();
  const don = await prisma.don.findUniqueOrThrow({ where: { id: donId } });
  if (don.entrepriseId !== session.entrepriseId) throw new Error("Don non autorisé.");
  await assurerDonModifiable(donId);

  if (!don.pieceJointeContenu || !don.pieceJointeContentType) {
    return { ok: false, error: "Aucune pièce jointe à analyser." };
  }

  let extraits;
  try {
    extraits = await extraireArticlesDepuisFichier(Buffer.from(don.pieceJointeContenu), don.pieceJointeContentType);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur d'extraction inconnue." };
  }
  if (extraits.length === 0) {
    return { ok: false, error: "Aucun article reconnaissable dans la pièce jointe." };
  }

  const articles = await prisma.article.createManyAndReturn({
    data: extraits.map((a) => ({ donId, designation: a.designation, quantiteDeclaree: a.quantite, poidsKg: a.poidsKg })),
  });
  revalidatePath("/");
  return {
    ok: true,
    articles: articles.map((a) => ({ id: a.id, designation: a.designation, quantiteDeclaree: a.quantiteDeclaree, poidsKg: a.poidsKg })),
  };
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
  let bonIdAutoAssigne: string | null = null;

  if (assignationsAujourdhui.length === 1) {
    const association = assignationsAujourdhui[0].association;
    await prisma.don.update({
      where: { id: donId },
      data: { statut: "PRIS_EN_CHARGE", associationAssigneeId: association.id, publieLe: new Date() },
    });
    const bon = await prisma.bonEnlevement.create({
      data: {
        numero: await genererNumeroBon(),
        donId,
        entrepriseId: session.entrepriseId,
        associationId: association.id,
      },
    });
    assigneA = association.denomination;
    bonIdAutoAssigne = bon.id;
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
  return { ok: true as const, id: nouveauBrouillon.id, articles: nouveauBrouillon.articles, assigneA, bonId: bonIdAutoAssigne };
}

export async function sePositionner(
  donId: string,
  forcerMalgreAvertissement: boolean = false,
  articleIds: string[] | null = null
): Promise<{ ok: true; bonId: string } | { ok: false; error: string; conventionId?: string; avertissementHabilitation?: boolean }> {
  const session = await requireSession();
  if (session.role !== "ASSOCIATION" || !session.associationId) throw new Error("Action réservée aux associations.");

  const donCible = await prisma.don.findUniqueOrThrow({ where: { id: donId }, include: { articles: true } });

  // Don matériel divisible : on réclame seulement les articles choisis, pas le don entier.
  if (articleIds && articleIds.length > 0) {
    if (donCible.type !== "MATERIEL" || !donCible.divisible) {
      return { ok: false, error: "Ce don ne peut pas être réclamé article par article." };
    }
    const idsValides = new Set(donCible.articles.filter((a) => a.associationAssigneeId == null).map((a) => a.id));
    if (!articleIds.every((id) => idsValides.has(id))) {
      return { ok: false, error: "Certains articles choisis ne sont plus disponibles, merci de rafraîchir la page." };
    }
  }

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
          "Ce commerce dépasse 400 m² de surface de vente : la loi Garot lui impose de proposer une convention de don à au moins une association habilitée. Votre association n'est pas déclarée habilitée — vous pouvez tout de même vous positionner sur ce don, ce n'est pas interdit, mais ce commerce devra aussi avoir au moins une association habilitée parmi ses partenaires pour être en conformité.",
      };
    }
  }

  const associationId = session.associationId;
  const reclameArticlesChoisis = articleIds && articleIds.length > 0;

  if (reclameArticlesChoisis) {
    // Une seule demande de positionnement par association et par don : on ne fusionne pas de
    // nouveaux articles dans un bon déjà créé (en attente, accepté ou déjà confirmé).
    const bonExistant = await prisma.bonEnlevement.findUnique({
      where: { donId_associationId: { donId, associationId } },
    });
    if (bonExistant) {
      return { ok: false, error: "Vous avez déjà une demande de positionnement sur ce don. Consultez votre bon d'enlèvement." };
    }

    // Réclamation partielle (don matériel divisible) : seuls les articles choisis changent de
    // main, le don reste ouvert aux autres associations tant qu'il reste des articles libres.
    // La demande attend l'accord du donateur avant de pouvoir être signée (cf. refuserPositionnement).
    const { count } = await prisma.article.updateMany({
      where: { id: { in: articleIds! }, donId, associationAssigneeId: null },
      data: { associationAssigneeId: associationId },
    });
    if (count !== articleIds!.length) {
      return { ok: false, error: "Certains articles viennent d'être réclamés par une autre association, merci de rafraîchir la page." };
    }
    const donMisAJour = await prisma.don.findUniqueOrThrow({ where: { id: donId }, include: { articles: true } });
    if (articlesEntierementReclames(donMisAJour)) {
      await prisma.don.update({ where: { id: donId }, data: { statut: "PRIS_EN_CHARGE" } });
    }

    const bon = await prisma.bonEnlevement.create({
      data: {
        numero: await genererNumeroBon(),
        donId,
        entrepriseId: donCible.entrepriseId,
        associationId,
        enAttenteValidationDonateur: true,
      },
    });
    revalidatePath("/dons");
    revalidatePath("/nouveau-don-materiel");

    const association = await prisma.association.findUniqueOrThrow({ where: { id: associationId } });
    await notifier(
      { entrepriseId: donCible.entrepriseId },
      "Nouvelle demande de positionnement sur votre don",
      `${association.denomination} souhaite récupérer une partie de votre don matériel divisible.\n\nRendez-vous sur l'écran « Nouveau don matériel » pour l'accepter ou la refuser.`,
      "/nouveau-don-materiel"
    );

    return { ok: true, bonId: bon.id };
  }

  await prisma.don.update({
    where: { id: donId },
    data: { statut: "PRIS_EN_CHARGE", associationAssigneeId: associationId },
  });

  let bon = await prisma.bonEnlevement.findUnique({
    where: { donId_associationId: { donId, associationId } },
  });
  if (!bon) {
    bon = await prisma.bonEnlevement.create({
      data: {
        numero: await genererNumeroBon(),
        donId,
        entrepriseId: donCible.entrepriseId,
        associationId,
      },
    });
  }
  revalidatePath("/dons");
  return { ok: true, bonId: bon.id };
}

async function requireControleAssociation(articleId: string) {
  const session = await requireSession();
  const article = await prisma.article.findUniqueOrThrow({
    where: { id: articleId },
    include: {
      don: { include: { bonsEnlevement: { select: { associationId: true, confirme: true, enAttenteValidationDonateur: true } } } },
    },
  });
  // Don divisible : l'attributaire est porté par l'article. Don non divisible : par le don entier.
  const proprietaireId = article.associationAssigneeId ?? article.don.associationAssigneeId;
  if (session.role !== "ASSOCIATION" || proprietaireId !== session.associationId) {
    throw new Error("Action réservée à l'association destinataire de ce don.");
  }
  const bonAssocie = article.don.bonsEnlevement.find((b) => b.associationId === session.associationId);
  if (bonAssocie?.enAttenteValidationDonateur) {
    throw new Error("Le donateur doit d'abord valider votre demande de positionnement.");
  }
  assurerBonNonConfirme(bonAssocie);
  return { article, associationId: proprietaireId };
}

export async function validerArticle(articleId: string) {
  const { article, associationId } = await requireControleAssociation(articleId);

  const periodesCongesAssociation = await prisma.periodeConges.findMany({
    where: { associationId },
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

/** Quantité et température réellement constatées par l'association au moment de l'enlèvement. */
export async function constaterArticleAction(articleId: string, quantiteConstatee: string, temperature: string) {
  await requireControleAssociation(articleId);
  if (champTropLong(quantiteConstatee, 100) || champTropLong(temperature, 50)) {
    throw new Error("Valeur trop longue.");
  }
  await prisma.article.update({
    where: { id: articleId },
    data: { quantiteConstatee: quantiteConstatee.trim() || null, temperature: temperature.trim() || null },
  });
  revalidatePath("/bon-enlevement");
}

/**
 * Désigne le bénévole mandaté qui collecte physiquement ce don et signera le bon en son nom
 * (cf. Mandat de signature) — modifiable tant que l'association n'a pas encore signé.
 */
export async function definirBenevoleCollecteurAction(bonId: string, benevoleId: string | null) {
  const session = await requireSession();
  if (session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({ where: { id: bonId } });
  if (bon.associationId !== session.associationId) throw new Error("Bon non autorisé.");
  if (bon.enAttenteValidationDonateur) {
    throw new Error("Le donateur doit d'abord valider votre demande de positionnement.");
  }
  if (bon.confirme || bon.signatureAssociationLe) {
    throw new Error("Le bon est déjà signé par l'association : le bénévole collecteur ne peut plus être modifié.");
  }

  if (benevoleId) {
    const benevole = await prisma.benevole.findUniqueOrThrow({ where: { id: benevoleId } });
    if (benevole.associationId !== session.associationId || !benevole.mandatDonneLe) {
      throw new Error("Ce bénévole n'est pas mandaté par votre association.");
    }
  }

  await prisma.bonEnlevement.update({ where: { id: bonId }, data: { benevoleCollecteurId: benevoleId } });
  revalidatePath("/bon-enlevement");
}

export async function confirmerBon(bonId: string) {
  const session = await requireSession();
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({
    where: { id: bonId },
    include: { don: { include: { articles: true, bonsEnlevement: { select: { id: true, confirme: true } } } } },
  });
  const autorise =
    (session.role === "ENTREPRISE" && bon.entrepriseId === session.entrepriseId) ||
    (session.role === "ASSOCIATION" && bon.associationId === session.associationId);
  if (!autorise) throw new Error("Bon non autorisé.");
  if (bon.enAttenteValidationDonateur) {
    return { ok: false, error: "Le donateur doit d'abord valider cette demande de positionnement." };
  }
  if (!bon.signatureDonateurLe || !bon.signatureAssociationLe) {
    return { ok: false, error: "Les deux signatures sont requises avant de confirmer l'enlèvement." };
  }
  const poidsTotalRetenu = articlesDuBon(bon.don, bon.don.articles, bon.associationId)
    .filter((a) => a.statut === "VALIDE")
    .reduce((total, a) => total + a.poidsKg, 0);

  // Un don matériel divisible n'est clôturé que lorsque tous ses articles ont trouvé preneur
  // et que tous les bons associés (le sien y compris) sont confirmés — les autres associations
  // peuvent encore être en train de récupérer leur part.
  const autresBonsNonConfirmes = bon.don.bonsEnlevement.some((b) => b.id !== bon.id && !b.confirme);
  const seraCloture = !autresBonsNonConfirmes && articlesEntierementReclames(bon.don);

  await prisma.$transaction([
    prisma.bonEnlevement.update({
      where: { id: bonId },
      data: { confirme: true, dateHeureEnlevement: new Date(), poidsTotalRetenu },
    }),
    ...(seraCloture ? [prisma.don.update({ where: { id: bon.donId }, data: { statut: "CLOTURE" as const } })] : []),
  ]);

  revalidatePath("/bon-enlevement");
  revalidatePath("/archives");
  return { ok: true };
}

async function requireBonEnAttente(bonId: string) {
  const session = await requireSession();
  if (session.role !== "ENTREPRISE" || !session.entrepriseId) throw new Error("Action réservée aux entreprises.");
  const bon = await prisma.bonEnlevement.findUniqueOrThrow({ where: { id: bonId }, include: { entreprise: true } });
  if (bon.entrepriseId !== session.entrepriseId) throw new Error("Bon non autorisé.");
  if (!bon.enAttenteValidationDonateur) throw new Error("Cette demande n'est plus en attente de validation.");
  return bon;
}

/**
 * Le donateur accepte la sélection d'articles choisie par l'association : le bon devient
 * signable normalement (cf. sePositionner, qui crée la demande en attente pour un don divisible).
 */
export async function validerPositionnementAction(bonId: string) {
  const bon = await requireBonEnAttente(bonId);
  await prisma.bonEnlevement.update({ where: { id: bonId }, data: { enAttenteValidationDonateur: false } });
  revalidatePath("/nouveau-don-materiel");
  revalidatePath("/dons");

  await notifier(
    { associationId: bon.associationId },
    "Votre demande de positionnement a été acceptée",
    `${bon.entreprise.raisonSociale} a accepté votre demande. Vous pouvez maintenant consulter et signer le bon d'enlèvement.`,
    `/bon-enlevement/${bon.id}`
  );
}

/**
 * Le donateur refuse la sélection (trop petite, trop grande, ou tout autre motif) : les articles
 * réclamés redeviennent disponibles pour une autre association et la demande est annulée.
 */
export async function refuserPositionnementAction(bonId: string) {
  const bon = await requireBonEnAttente(bonId);
  await prisma.$transaction([
    prisma.article.updateMany({
      where: { donId: bon.donId, associationAssigneeId: bon.associationId },
      data: { associationAssigneeId: null },
    }),
    prisma.don.updateMany({ where: { id: bon.donId, statut: "PRIS_EN_CHARGE" }, data: { statut: "PUBLIE" } }),
    prisma.bonEnlevement.delete({ where: { id: bonId } }),
  ]);
  revalidatePath("/nouveau-don-materiel");
  revalidatePath("/dons");

  await notifier(
    { associationId: bon.associationId },
    "Votre demande de positionnement a été refusée",
    `${bon.entreprise.raisonSociale} a refusé votre demande de positionnement. Les articles sont de nouveau disponibles pour une autre association.`,
    "/dons"
  );
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

  const donCible = await prisma.don.findUniqueOrThrow({ where: { id: donId }, include: { articles: true } });

  let don = donCible;
  if (donCible.type === "MATERIEL" && donCible.divisible) {
    // Don divisible : le coordinateur attribue à cette association tout ce qui reste encore
    // libre, sans toucher aux articles déjà réclamés par d'autres.
    await prisma.article.updateMany({
      where: { donId, associationAssigneeId: null },
      data: { associationAssigneeId: associationId },
    });
    don = await prisma.don.findUniqueOrThrow({ where: { id: donId }, include: { articles: true } });
    if (articlesEntierementReclames(don)) {
      don = await prisma.don.update({ where: { id: donId }, data: { statut: "PRIS_EN_CHARGE" }, include: { articles: true } });
    }
  } else {
    don = await prisma.don.update({
      where: { id: donId },
      data: { statut: "PRIS_EN_CHARGE", associationAssigneeId: associationId },
      include: { articles: true },
    });
  }

  const bonExistant = await prisma.bonEnlevement.findUnique({
    where: { donId_associationId: { donId, associationId } },
  });
  if (!bonExistant) {
    await prisma.bonEnlevement.create({
      data: { numero: await genererNumeroBon(), donId, entrepriseId: don.entrepriseId, associationId },
    });
  }

  revalidatePath("/coordinateur");
}
