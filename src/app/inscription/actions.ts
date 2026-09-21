"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, hashPassword, landingPathForRole } from "@/lib/auth";
import { rechercherOrganismes, type SuggestionOrganisme } from "@/lib/rechercheEntreprises";
import { rechercherAdresses, type SuggestionAdresse } from "@/lib/ignAdresse";

function echec(code: string, email: string, type: string): never {
  const params = new URLSearchParams({ erreur: code, email, type });
  redirect(`/inscription?${params.toString()}`);
}

export async function rechercherOrganismeAction(
  q: string,
  type: "ENTREPRISE" | "ASSOCIATION"
): Promise<SuggestionOrganisme[]> {
  return rechercherOrganismes(q, type);
}

export async function rechercherAdresseAction(q: string): Promise<SuggestionAdresse[]> {
  return rechercherAdresses(q);
}

export async function inscriptionAction(formData: FormData) {
  const type = String(formData.get("type") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const motDePasseConfirmation = String(formData.get("motDePasseConfirmation") ?? "");
  const nomContact = String(formData.get("nomContact") ?? "").trim();

  if (type !== "ENTREPRISE" && type !== "ASSOCIATION") {
    echec("type_invalide", email, type);
  }
  if (!nomContact || !email || !motDePasse) {
    echec("champs_manquants", email, type);
  }
  if (motDePasse.length < 8) {
    echec("mdp_court", email, type);
  }
  if (motDePasse !== motDePasseConfirmation) {
    echec("mdp_different", email, type);
  }

  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    echec("email_pris", email, type);
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

    if (!raisonSociale || !siret || !adresse) {
      echec("champs_manquants", email, type);
    }

    const entreprise = await prisma.entreprise.create({
      data: {
        raisonSociale,
        siret,
        adresse,
        formeJuridique: formeJuridique || null,
        secteurActivite: secteurActivite || null,
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
    const declarationInteretGeneral = formData.get("declarationInteretGeneral") === "on";

    if (!denomination || !rna || !adresse) {
      echec("champs_manquants", email, type);
    }

    const association = await prisma.association.create({
      data: {
        denomination,
        rna,
        adresse,
        categorieEligibilite: categorieEligibilite || null,
        declarationInteretGeneral,
        ...coordonneesAdresse,
      },
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
