"use server";

import { redirect } from "next/navigation";
import { debutJourParis, finJourParis } from "@/lib/dateParis";
import { annulerDonsPourConges } from "@/lib/annulationDon";
import { formaterDateConges } from "@/lib/conges";
import { revalidatePath } from "next/cache";
import { clearSessionCookie, createSessionCookie, hashPassword, verifyPassword } from "@/lib/auth";
import { avertirChangementMotDePasse, erreurMotDePasse } from "@/lib/reinitialisation";
import { demanderChangementEmail } from "@/lib/changementEmail";
import { natureActiviteValide } from "@/lib/activiteEntreprise";
import { geocoderAdresse, isGoogleMapsServerConfigured } from "@/lib/googleMaps";
import { origineRequete } from "@/lib/requestOrigin";
import { getSessionLimitee as getSession } from "@/lib/sessionLimitee";
import { prisma } from "@/lib/prisma";
import { definitionDocumentPourRole, nomFichierSur, validerFichierDocument, type TypeDocument } from "@/lib/documents";
import { champTropLong, LONGUEUR_MAX_ADRESSE, LONGUEUR_MAX_CHAMP_COURT } from "@/lib/validation";
import { disponibilitesValides } from "@/lib/disponibilites";
import { typesActiviteValides } from "@/lib/activiteAssociation";
import { IDS_FAMILLES_ALERTE, RAYONS_ALERTE_KM } from "@/lib/famillesAlerte";
import { roleBenevoleValide } from "@/lib/benevoles";
import { tropDEnvoisFichiers, tropDeTentatives } from "@/lib/rateLimiter";
import { endpointPushValide } from "@/lib/webPush";

const LONGUEUR_MAX_NOTRE_ACTION = 2000;

export async function deconnexionAction() {
  await clearSessionCookie();
  redirect("/connexion");
}

export async function definirReferentDonAction(formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error("Non authentifié.");

  const nom = String(formData.get("referentDonNom") ?? "").trim();
  const telephone = String(formData.get("referentDonTelephone") ?? "").trim();
  const data = { referentDonNom: nom || null, referentDonTelephone: telephone || null };

  if (session.role === "ENTREPRISE" && session.entrepriseId) {
    await prisma.entreprise.update({ where: { id: session.entrepriseId }, data });
  } else if (session.role === "ASSOCIATION" && session.associationId) {
    await prisma.association.update({ where: { id: session.associationId }, data });
  } else {
    throw new Error("Action réservée aux entreprises et associations.");
  }
  revalidatePath("/profil");
}

export async function definirSurfaceVenteAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ENTREPRISE" || !session.entrepriseId) {
    throw new Error("Action réservée aux entreprises.");
  }

  const brut = String(formData.get("surfaceVenteM2") ?? "").trim().replace(",", ".");
  const surfaceVenteM2 = brut ? Number(brut) : null;
  if (surfaceVenteM2 != null && (Number.isNaN(surfaceVenteM2) || surfaceVenteM2 < 0)) {
    throw new Error("Surface de vente invalide.");
  }

  await prisma.entreprise.update({ where: { id: session.entrepriseId }, data: { surfaceVenteM2 } });
  revalidatePath("/profil");
  revalidatePath("/planning");
}

export async function definirConformiteAssociationAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const habilitationStatut = String(formData.get("habilitationStatut") ?? "NON_HABILITEE");
  if (!["NON_HABILITEE", "REGIONALE", "NATIONALE"].includes(habilitationStatut)) {
    throw new Error("Statut d'habilitation invalide.");
  }
  const habilitationDateFinBrut = String(formData.get("habilitationDateFin") ?? "").trim();
  const declarationDdpp = formData.get("declarationDdpp") === "on";
  const declarationDdppDateBrut = String(formData.get("declarationDdppDate") ?? "").trim();

  await prisma.association.update({
    where: { id: session.associationId },
    data: {
      habilitationStatut: habilitationStatut as "NON_HABILITEE" | "REGIONALE" | "NATIONALE",
      habilitationDateFin: habilitationDateFinBrut ? new Date(habilitationDateFinBrut) : null,
      declarationDdpp,
      declarationDdppDate: declarationDdpp ? (declarationDdppDateBrut ? new Date(declarationDdppDateBrut) : new Date()) : null,
    },
  });
  revalidatePath("/profil");
  revalidatePath("/dons");
}

export async function ajouterBenevoleAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const nom = String(formData.get("benevoleNom") ?? "").trim();
  const telephone = String(formData.get("benevoleTelephone") ?? "").trim();
  if (!nom) return;
  if (champTropLong(nom, LONGUEUR_MAX_CHAMP_COURT) || champTropLong(telephone, LONGUEUR_MAX_CHAMP_COURT)) {
    throw new Error("Champ trop long.");
  }

  const roleBrut = String(formData.get("benevoleRole") ?? "COLLECTEUR");
  const role = roleBenevoleValide(roleBrut) ? roleBrut : "COLLECTEUR";
  const assuranceRcAttestee = formData.get("benevoleAssuranceRc") === "on";
  const mandatDonne = formData.get("benevoleMandat") === "on";

  await prisma.benevole.create({
    data: {
      associationId: session.associationId,
      nom,
      telephone: telephone || null,
      role,
      assuranceRcAttestee,
      assuranceRcAttesteeLe: assuranceRcAttestee ? new Date() : null,
      mandatDonneLe: mandatDonne ? new Date() : null,
    },
  });
  revalidatePath("/profil");
}

export async function basculerAssuranceRcBenevoleAction(benevoleId: string) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const benevole = await prisma.benevole.findUniqueOrThrow({ where: { id: benevoleId } });
  if (benevole.associationId !== session.associationId) throw new Error("Bénévole non autorisé.");

  const assuranceRcAttestee = !benevole.assuranceRcAttestee;
  await prisma.benevole.update({
    where: { id: benevoleId },
    data: { assuranceRcAttestee, assuranceRcAttesteeLe: assuranceRcAttestee ? new Date() : null },
  });
  revalidatePath("/profil");
}

/** Mandat du président donnant à ce bénévole le pouvoir de signer les bordereaux de remise. */
export async function basculerMandatBenevoleAction(benevoleId: string) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const benevole = await prisma.benevole.findUniqueOrThrow({ where: { id: benevoleId } });
  if (benevole.associationId !== session.associationId) throw new Error("Bénévole non autorisé.");

  const mandatDonne = !benevole.mandatDonneLe;
  await prisma.benevole.update({
    where: { id: benevoleId },
    data: { mandatDonneLe: mandatDonne ? new Date() : null },
  });
  revalidatePath("/profil");
}

export async function televerserDocumentAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };
  if (session.role !== "ENTREPRISE" && session.role !== "ASSOCIATION") {
    return { ok: false, error: "Action réservée aux entreprises et associations." };
  }

  const type = String(formData.get("type") ?? "") as TypeDocument;
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File)) return { ok: false, error: "Aucun fichier sélectionné." };
  if (await tropDEnvoisFichiers(session.userId)) {
    return { ok: false, error: "Trop de fichiers envoyés en peu de temps, merci de réessayer dans une heure." };
  }

  const validation = validerFichierDocument(fichier);
  if (!validation.ok) return validation;

  try {
    // Valide que le type de document appartient bien au rôle de l'utilisateur.
    definitionDocumentPourRole(session.role, type);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Type de document invalide." };
  }

  const contenu = Buffer.from(new Uint8Array(await fichier.arrayBuffer()));
  const donneesCommunes = {
    type,
    nomFichier: nomFichierSur(fichier.name),
    contentType: fichier.type,
    contenu,
    tailleOctets: fichier.size,
  };

  if (session.role === "ENTREPRISE" && session.entrepriseId) {
    await prisma.document.upsert({
      where: { entrepriseId_type: { entrepriseId: session.entrepriseId, type } },
      update: donneesCommunes,
      create: { ...donneesCommunes, entrepriseId: session.entrepriseId },
    });
  } else if (session.role === "ASSOCIATION" && session.associationId) {
    await prisma.document.upsert({
      where: { associationId_type: { associationId: session.associationId, type } },
      update: donneesCommunes,
      create: { ...donneesCommunes, associationId: session.associationId },
    });
  }
  revalidatePath("/profil");
  return { ok: true };
}

export async function retirerBenevoleAction(benevoleId: string) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const benevole = await prisma.benevole.findUniqueOrThrow({ where: { id: benevoleId } });
  if (benevole.associationId !== session.associationId) throw new Error("Bénévole non autorisé.");

  await prisma.benevole.delete({ where: { id: benevoleId } });
  revalidatePath("/profil");
}

export async function ajouterPeriodeCongesAction(formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== "ENTREPRISE" && session.role !== "ASSOCIATION")) {
    throw new Error("Action réservée aux entreprises et associations.");
  }

  const debutBrut = String(formData.get("congesDebut") ?? "").trim();
  const finBrut = String(formData.get("congesFin") ?? "").trim();
  const motif = String(formData.get("congesMotif") ?? "").trim();
  if (!debutBrut || !finBrut) throw new Error("Les dates de début et de fin sont requises.");
  if (champTropLong(motif, LONGUEUR_MAX_CHAMP_COURT)) throw new Error("Motif trop long.");

  const debut = debutJourParis(debutBrut);
  const fin = finJourParis(finBrut);
  if (!debut || !fin || fin < debut) {
    throw new Error("Période de congés invalide.");
  }

  if (session.role === "ENTREPRISE" && session.entrepriseId) {
    await prisma.periodeConges.create({
      data: { entrepriseId: session.entrepriseId, debut, fin, motif: motif || null },
    });
    // Une fermeture déjà en cours annule immédiatement les dons encore annulables (motif
    // « Fermeture pour congés », associations prévenues) : l'entreprise ne sera pas là pour honorer
    // l'enlèvement. Un don dont le bon est déjà signé n'est pas touché (cf. src/lib/annulationDon.ts).
    if (debut <= new Date()) {
      await annulerDonsPourConges(session.entrepriseId, formaterDateConges(fin));
    }
  } else if (session.role === "ASSOCIATION" && session.associationId) {
    await prisma.periodeConges.create({
      data: { associationId: session.associationId, debut, fin, motif: motif || null },
    });
  }

  revalidatePath("/profil");
  revalidatePath("/dons");
  revalidatePath("/associations");
  revalidatePath("/");
}

export async function retirerPeriodeCongesAction(periodeId: string) {
  const session = await getSession();
  if (!session || (session.role !== "ENTREPRISE" && session.role !== "ASSOCIATION")) {
    throw new Error("Action réservée aux entreprises et associations.");
  }

  const periode = await prisma.periodeConges.findUniqueOrThrow({ where: { id: periodeId } });
  const autorise =
    (session.role === "ENTREPRISE" && periode.entrepriseId === session.entrepriseId) ||
    (session.role === "ASSOCIATION" && periode.associationId === session.associationId);
  if (!autorise) throw new Error("Période non autorisée.");

  await prisma.periodeConges.delete({ where: { id: periodeId } });
  revalidatePath("/profil");
  revalidatePath("/dons");
  revalidatePath("/associations");
  revalidatePath("/");
}

export async function definirDisponibilitesAction(
  disponibilites: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    return { ok: false, error: "Action réservée aux associations." };
  }

  await prisma.association.update({
    where: { id: session.associationId },
    data: { disponibilitesRetrait: disponibilitesValides(disponibilites) },
  });
  revalidatePath("/profil");
  return { ok: true };
}

export async function definirPresentationAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const typesActivite = typesActiviteValides(formData.getAll("typesActivite").map(String));
  const notreAction = String(formData.get("notreAction") ?? "").trim();
  if (champTropLong(notreAction, LONGUEUR_MAX_NOTRE_ACTION)) {
    throw new Error("Le texte de présentation est trop long.");
  }

  await prisma.association.update({
    where: { id: session.associationId },
    data: { typesActivite, notreAction: notreAction || null },
  });
  revalidatePath("/profil");
  revalidatePath("/associations");
}

/**
 * Capacité d'accueil déclarative (en complément de l'attestation chaîne du froid) et nombre de
 * bénéficiaires servis (purement informatif). Ni l'un ni l'autre n'est jamais vérifié : ce sont
 * des indications qui servent à avertir avant un positionnement, pas des seuils imposés.
 */
export async function definirCapaciteAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const capaciteBrute = String(formData.get("capaciteAccueilKg") ?? "").trim();
  const beneficiairesBrut = String(formData.get("nombreBeneficiaires") ?? "").trim();

  let capaciteAccueilKg: number | null = null;
  if (capaciteBrute) {
    capaciteAccueilKg = Number(capaciteBrute.replace(",", "."));
    if (!Number.isFinite(capaciteAccueilKg) || capaciteAccueilKg <= 0) {
      throw new Error("Capacité invalide.");
    }
  }

  let nombreBeneficiaires: number | null = null;
  if (beneficiairesBrut) {
    nombreBeneficiaires = Number(beneficiairesBrut);
    if (!Number.isInteger(nombreBeneficiaires) || nombreBeneficiaires <= 0) {
      throw new Error("Nombre de bénéficiaires invalide.");
    }
  }

  await prisma.association.update({
    where: { id: session.associationId },
    data: { capaciteAccueilKg, nombreBeneficiaires },
  });
  revalidatePath("/profil");
  revalidatePath("/associations");
}

/** Réglages des alertes « nouveau don » de l'association (cf. src/lib/alertesDon.ts). */
/**
 * Changement de mot de passe depuis le profil : l'ancien est exigé ; les autres sessions du compte
 * sont déconnectées (version de session incrémentée), la session courante est renouvelée.
 */
export async function changerMotDePasseAction(
  _etat: { ok: true } | { ok: false; error: string } | null,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };
  if (await tropDeTentatives(`changement-mdp:${session.userId}`, 5, 15 * 60 * 1000)) {
    return { ok: false, error: "Trop de tentatives. Merci de réessayer dans quelques minutes." };
  }

  const ancien = String(formData.get("ancien") ?? "");
  const nouveau = String(formData.get("motDePasse") ?? "");
  const erreur = erreurMotDePasse(nouveau, String(formData.get("confirmation") ?? ""));
  if (erreur) return { ok: false, error: erreur };

  const utilisateur = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!utilisateur || !(await verifyPassword(ancien, utilisateur.passwordHash))) {
    return { ok: false, error: "Le mot de passe actuel est incorrect." };
  }
  if (ancien === nouveau) return { ok: false, error: "Le nouveau mot de passe doit être différent de l'actuel." };

  await prisma.user.update({
    where: { id: utilisateur.id },
    data: { passwordHash: await hashPassword(nouveau), sessionVersion: { increment: 1 } },
  });
  const { sv: _ancienneVersion, ...charge } = session;
  void _ancienneVersion;
  await createSessionCookie(charge);
  await avertirChangementMotDePasse(utilisateur.email, utilisateur.nom);
  return { ok: true };
}

type ResultatFormulaire = { ok: true } | { ok: false; error: string } | null;

/** Position sur la carte d'une nouvelle adresse (null si le service de cartographie est absent ou ne la trouve pas). */
async function coordonneesAdresse(adresse: string) {
  const c = isGoogleMapsServerConfigured() ? await geocoderAdresse(adresse) : null;
  return { latitude: c?.lat ?? null, longitude: c?.lng ?? null };
}

/**
 * Informations de l'organisation modifiables par ses utilisateurs (chantier C4b, 2026-10-10).
 * Le nom, le SIRET et le RNA n'en font pas partie : identité officielle, corrigée par le
 * coordinateur (décision de Bruno, option A) — les PDF étant refabriqués à chaque téléchargement,
 * un renommage modifierait aussi les documents déjà signés.
 */
export async function modifierInformationsOrganisationAction(_etat: ResultatFormulaire, formData: FormData): Promise<ResultatFormulaire> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };
  const texte = (nom: string) => String(formData.get(nom) ?? "").trim();
  const adresse = texte("adresse");
  if (!adresse) return { ok: false, error: "L'adresse est obligatoire." };
  if (champTropLong(adresse, LONGUEUR_MAX_ADRESSE)) return { ok: false, error: "Adresse trop longue." };

  if (session.role === "ENTREPRISE" && session.entrepriseId) {
    const formeJuridique = texte("formeJuridique");
    const secteurActivite = texte("secteurActivite");
    const natureActivite = texte("natureActivite");
    if (champTropLong(formeJuridique) || champTropLong(secteurActivite)) return { ok: false, error: "Un champ est trop long." };
    if (!natureActiviteValide(natureActivite)) return { ok: false, error: "Nature des dons invalide." };
    const actuelle = await prisma.entreprise.findUniqueOrThrow({ where: { id: session.entrepriseId }, select: { adresse: true } });
    await prisma.entreprise.update({
      where: { id: session.entrepriseId },
      data: {
        formeJuridique: formeJuridique || null,
        secteurActivite: secteurActivite || null,
        natureActivite,
        adresse,
        ...(adresse !== actuelle.adresse ? await coordonneesAdresse(adresse) : {}),
      },
    });
  } else if (session.role === "ASSOCIATION" && session.associationId) {
    const categorieEligibilite = texte("categorieEligibilite");
    const categoriesDon = texte("categoriesDon")
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (champTropLong(categorieEligibilite) || categoriesDon.some((c) => champTropLong(c, 60)) || categoriesDon.length > 30) {
      return { ok: false, error: "Un champ est trop long." };
    }
    const actuelle = await prisma.association.findUniqueOrThrow({ where: { id: session.associationId }, select: { adresse: true } });
    await prisma.association.update({
      where: { id: session.associationId },
      data: {
        categorieEligibilite: categorieEligibilite || null,
        categoriesDon,
        adresse,
        ...(adresse !== actuelle.adresse ? await coordonneesAdresse(adresse) : {}),
      },
    });
  } else {
    return { ok: false, error: "Action réservée aux entreprises et associations." };
  }

  revalidatePath("/profil");
  revalidatePath("/");
  revalidatePath("/dons");
  revalidatePath("/associations");
  return { ok: true };
}

/** Nom affiché de l'utilisateur connecté (la session est renouvelée pour l'afficher partout). */
export async function modifierNomAction(_etat: ResultatFormulaire, formData: FormData): Promise<ResultatFormulaire> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { ok: false, error: "Indiquez votre nom." };
  if (champTropLong(nom, 100)) return { ok: false, error: "Nom trop long." };
  await prisma.user.update({ where: { id: session.userId }, data: { nom } });
  const { sv: _version, ...charge } = session;
  void _version;
  await createSessionCookie({ ...charge, nom });
  revalidatePath("/profil");
  return { ok: true };
}

/** Changement d'adresse e-mail : envoie un lien de confirmation à la nouvelle adresse. */
export async function demanderChangementEmailAction(_etat: ResultatFormulaire, formData: FormData): Promise<ResultatFormulaire> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Non authentifié." };
  if (await tropDeTentatives(`changement-email:${session.userId}`, 5, 60 * 60 * 1000)) {
    return { ok: false, error: "Trop de demandes. Merci de réessayer plus tard." };
  }
  const erreur = await demanderChangementEmail(
    session.userId,
    String(formData.get("motDePasse") ?? ""),
    String(formData.get("nouvelEmail") ?? ""),
    await origineRequete()
  );
  return erreur ? { ok: false, error: erreur } : { ok: true };
}

export async function definirAlertesAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const rayonBrut = String(formData.get("alerteRayonKm") ?? "");
  const rayon = rayonBrut === "" ? null : Number(rayonBrut);
  if (rayon !== null && !(RAYONS_ALERTE_KM as readonly number[]).includes(rayon)) throw new Error("Rayon invalide.");
  const familles = [...new Set(formData.getAll("alerteFamilles").map(String))].filter((f) => IDS_FAMILLES_ALERTE.has(f));

  await prisma.association.update({
    where: { id: session.associationId },
    data: { alertesActives: formData.get("alertesActives") === "on", alerteRayonKm: rayon, alerteFamilles: familles },
  });
  revalidatePath("/profil");
}

export async function definirContactRappelAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "ASSOCIATION" || !session.associationId) {
    throw new Error("Action réservée aux associations.");
  }

  const nom = String(formData.get("contactRappelNom") ?? "").trim();
  const telephone = String(formData.get("contactRappelTelephone") ?? "").trim();
  const email = String(formData.get("contactRappelEmail") ?? "").trim();
  if (champTropLong(nom, LONGUEUR_MAX_CHAMP_COURT) || champTropLong(telephone, LONGUEUR_MAX_CHAMP_COURT) || champTropLong(email, LONGUEUR_MAX_CHAMP_COURT)) {
    throw new Error("Un des champs dépasse la longueur maximale autorisée.");
  }

  await prisma.association.update({
    where: { id: session.associationId },
    data: {
      contactRappelNom: nom || null,
      contactRappelTelephone: telephone || null,
      contactRappelEmail: email || null,
    },
  });
  revalidatePath("/profil");
}

/** Enregistre l'abonnement push de cet appareil pour le compte connecté (cf. ActiverNotificationsPush). */
export async function enregistrerAbonnementPushAction(abonnement: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const session = await getSession();
  if (!session) throw new Error("Non authentifié.");
  // N'accepte que les adresses des vrais services de notification des navigateurs : sans ce
  // contrôle, un appel direct à cette action (ce n'est qu'une requête HTTP, pas forcément une vraie
  // inscription PushManager du navigateur) pourrait faire du serveur un relais vers une adresse
  // arbitraire dès qu'une notification est envoyée à ce compte (cf. src/lib/webPush.ts).
  if (!endpointPushValide(abonnement.endpoint)) {
    throw new Error("Adresse d'abonnement aux notifications invalide.");
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: abonnement.endpoint },
    create: { userId: session.userId, endpoint: abonnement.endpoint, p256dh: abonnement.keys.p256dh, auth: abonnement.keys.auth },
    update: { userId: session.userId, p256dh: abonnement.keys.p256dh, auth: abonnement.keys.auth },
  });
}

/** Retire l'abonnement push de cet appareil (désactivation depuis le profil). */
export async function retirerAbonnementPushAction(endpoint: string) {
  const session = await getSession();
  if (!session) throw new Error("Non authentifié.");
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.userId } });
}
