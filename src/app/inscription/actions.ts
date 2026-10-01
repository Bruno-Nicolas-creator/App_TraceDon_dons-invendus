"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, hashPassword, landingPathForRole } from "@/lib/auth";
import { rechercherOrganismes, type SuggestionOrganisme } from "@/lib/rechercheEntreprises";
import { rechercherAdresses, type SuggestionAdresse } from "@/lib/ignAdresse";
import { nomFichierSur, validerFichierDocument } from "@/lib/documents";
import { champTropLong, LONGUEUR_MAX_ADRESSE, rnaValide, siretValide } from "@/lib/validation";
import { natureActiviteValide } from "@/lib/activiteEntreprise";
import { adresseIpRequete } from "@/lib/requestOrigin";
import { tropDeTentatives } from "@/lib/rateLimiter";

export type EtatInscription = { erreur: string } | null;

// Ces trois actions sont accessibles sans compte (formulaire d'inscription public) : on limite
// par adresse IP plutôt que par compte, pour éviter qu'un script les appelle en boucle (bourrage
// de la base pour l'inscription, épuisement des quotas gratuits des API tierces pour la recherche).
const MAX_RECHERCHES = 30;
const FENETRE_RECHERCHE_MS = 60 * 1000;
const MAX_INSCRIPTIONS = 5;
const FENETRE_INSCRIPTION_MS = 60 * 60 * 1000;

type ResultatFichier =
  | { ok: true; nomFichier: string; contentType: string; contenu: Buffer; tailleOctets: number }
  | { ok: false; erreur: string };

async function lireFichierObligatoire(formData: FormData, champ: string): Promise<ResultatFichier> {
  const fichier = formData.get(champ);
  if (!(fichier instanceof File)) return { ok: false, erreur: "champs_manquants" };
  const validation = validerFichierDocument(fichier);
  if (!validation.ok) {
    return {
      ok: false,
      erreur: fichier.size > 0 && fichier.size <= 5 * 1024 * 1024 ? "fichier_type_invalide" : "fichier_trop_volumineux",
    };
  }
  return {
    ok: true,
    nomFichier: nomFichierSur(fichier.name),
    contentType: fichier.type,
    contenu: Buffer.from(new Uint8Array(await fichier.arrayBuffer())),
    tailleOctets: fichier.size,
  };
}

export async function rechercherOrganismeAction(
  q: string,
  type: "ENTREPRISE" | "ASSOCIATION"
): Promise<SuggestionOrganisme[]> {
  const ip = await adresseIpRequete();
  if (tropDeTentatives(`recherche-organisme:${ip}`, MAX_RECHERCHES, FENETRE_RECHERCHE_MS)) return [];
  return rechercherOrganismes(q, type);
}

export async function rechercherAdresseAction(q: string): Promise<SuggestionAdresse[]> {
  const ip = await adresseIpRequete();
  if (tropDeTentatives(`recherche-adresse:${ip}`, MAX_RECHERCHES, FENETRE_RECHERCHE_MS)) return [];
  return rechercherAdresses(q);
}

export async function inscriptionAction(_etatPrecedent: EtatInscription, formData: FormData): Promise<EtatInscription> {
  const ip = await adresseIpRequete();
  if (tropDeTentatives(`inscription:${ip}`, MAX_INSCRIPTIONS, FENETRE_INSCRIPTION_MS)) {
    return { erreur: "trop_de_tentatives" };
  }

  const type = String(formData.get("type") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const motDePasseConfirmation = String(formData.get("motDePasseConfirmation") ?? "");
  const nomContact = String(formData.get("nomContact") ?? "").trim();

  if (type !== "ENTREPRISE" && type !== "ASSOCIATION") {
    return { erreur: "type_invalide" };
  }
  if (!nomContact || !email || !motDePasse) {
    return { erreur: "champs_manquants" };
  }
  if (champTropLong(nomContact) || champTropLong(email)) {
    return { erreur: "champ_trop_long" };
  }
  if (motDePasse.length < 8) {
    return { erreur: "mdp_court" };
  }
  if (motDePasse !== motDePasseConfirmation) {
    return { erreur: "mdp_different" };
  }

  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    return { erreur: "email_pris" };
  }

  const passwordHash = await hashPassword(motDePasse);

  const latitudeBrute = Number(formData.get("adresseLatitude"));
  const longitudeBrute = Number(formData.get("adresseLongitude"));
  const coordonneesAdresse =
    Number.isFinite(latitudeBrute) && Number.isFinite(longitudeBrute) && latitudeBrute !== 0
      ? { latitude: latitudeBrute, longitude: longitudeBrute }
      : {};

  if (type === "ENTREPRISE") {
    const raisonSociale = String(formData.get("raisonSociale") ?? "").trim();
    const siret = String(formData.get("siret") ?? "").trim();
    const adresse = String(formData.get("adresse") ?? "").trim();
    const formeJuridique = String(formData.get("formeJuridique") ?? "").trim();
    const secteurActivite = String(formData.get("secteurActivite") ?? "").trim();
    const natureActiviteBrute = String(formData.get("natureActivite") ?? "");

    if (!raisonSociale || !siret || !adresse) {
      return { erreur: "champs_manquants" };
    }
    if (champTropLong(raisonSociale) || champTropLong(formeJuridique) || champTropLong(secteurActivite) || champTropLong(adresse, LONGUEUR_MAX_ADRESSE)) {
      return { erreur: "champ_trop_long" };
    }
    if (!siretValide(siret)) {
      return { erreur: "siret_invalide" };
    }
    if (!natureActiviteValide(natureActiviteBrute)) {
      return { erreur: "champs_manquants" };
    }

    const entreprise = await prisma.entreprise.create({
      data: {
        raisonSociale,
        siret,
        adresse,
        formeJuridique: formeJuridique || null,
        secteurActivite: secteurActivite || null,
        natureActivite: natureActiviteBrute,
        ...coordonneesAdresse,
      },
    });

    const utilisateur = await prisma.user.create({
      data: { email, passwordHash, nom: nomContact, role: "ENTREPRISE", entrepriseId: entreprise.id },
    });

    await createSessionCookie({
      userId: utilisateur.id,
      nom: utilisateur.nom,
      role: "ENTREPRISE",
      entrepriseId: entreprise.id,
      associationId: null,
    });
  } else {
    const denomination = String(formData.get("denomination") ?? "").trim();
    const rna = String(formData.get("rna") ?? "").trim();
    const adresse = String(formData.get("adresse") ?? "").trim();
    const categorieEligibilite = String(formData.get("categorieEligibilite") ?? "").trim();
    const categoriesDon = String(formData.get("categoriesDon") ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && !champTropLong(c, 60));
    const declarationInteretGeneral = formData.get("declarationInteretGeneral") === "on";
    const rescritDemande = formData.get("rescritDemande") === "on";

    if (!denomination || !rna || !adresse) {
      return { erreur: "champs_manquants" };
    }
    if (champTropLong(denomination) || champTropLong(categorieEligibilite) || champTropLong(adresse, LONGUEUR_MAX_ADRESSE)) {
      return { erreur: "champ_trop_long" };
    }
    if (!rnaValide(rna)) {
      return { erreur: "rna_invalide" };
    }

    const recepisseRnaResultat = await lireFichierObligatoire(formData, "recepisseRna");
    if (!recepisseRnaResultat.ok) return { erreur: recepisseRnaResultat.erreur };
    const statutsSignesResultat = await lireFichierObligatoire(formData, "statutsSignes");
    if (!statutsSignesResultat.ok) return { erreur: statutsSignesResultat.erreur };
    const preuveRescritFiscalResultat = rescritDemande ? await lireFichierObligatoire(formData, "preuveRescritFiscal") : null;
    if (preuveRescritFiscalResultat && !preuveRescritFiscalResultat.ok) return { erreur: preuveRescritFiscalResultat.erreur };

    const recepisseRna = { nomFichier: recepisseRnaResultat.nomFichier, contentType: recepisseRnaResultat.contentType, contenu: recepisseRnaResultat.contenu, tailleOctets: recepisseRnaResultat.tailleOctets };
    const statutsSignes = { nomFichier: statutsSignesResultat.nomFichier, contentType: statutsSignesResultat.contentType, contenu: statutsSignesResultat.contenu, tailleOctets: statutsSignesResultat.tailleOctets };
    const preuveRescritFiscal = preuveRescritFiscalResultat
      ? { nomFichier: preuveRescritFiscalResultat.nomFichier, contentType: preuveRescritFiscalResultat.contentType, contenu: preuveRescritFiscalResultat.contenu, tailleOctets: preuveRescritFiscalResultat.tailleOctets }
      : null;

    const association = await prisma.association.create({
      data: {
        denomination,
        rna,
        adresse,
        categorieEligibilite: categorieEligibilite || null,
        categoriesDon,
        declarationInteretGeneral,
        rescritStatut: rescritDemande ? "EN_ATTENTE" : "NON_DEPOSE",
        rescritDateDepot: rescritDemande ? new Date() : null,
        ...coordonneesAdresse,
      },
    });

    await prisma.document.createMany({
      data: [
        { associationId: association.id, type: "RECEPISSE_RNA", ...recepisseRna, contenu: recepisseRna.contenu as unknown as never },
        { associationId: association.id, type: "STATUTS_SIGNES", ...statutsSignes, contenu: statutsSignes.contenu as unknown as never },
        ...(preuveRescritFiscal
          ? [
              {
                associationId: association.id,
                type: "PREUVE_RESCRIT_FISCAL" as const,
                ...preuveRescritFiscal,
                contenu: preuveRescritFiscal.contenu as unknown as never,
              },
            ]
          : []),
      ],
    });

    const utilisateur = await prisma.user.create({
      data: { email, passwordHash, nom: nomContact, role: "ASSOCIATION", associationId: association.id },
    });

    await createSessionCookie({
      userId: utilisateur.id,
      nom: utilisateur.nom,
      role: "ASSOCIATION",
      entrepriseId: null,
      associationId: association.id,
    });
  }

  redirect(landingPathForRole(type === "ENTREPRISE" ? "ENTREPRISE" : "ASSOCIATION"));
}
