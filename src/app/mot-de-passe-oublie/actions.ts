"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { tropDeTentatives } from "@/lib/rateLimiter";
import { adresseIpRequete, origineRequete } from "@/lib/requestOrigin";
import { envoyerLienReinitialisation, reinitialiserMotDePasse } from "@/lib/reinitialisation";

const FENETRE_MS = 15 * 60 * 1000;

type Etat = { ok: true } | { ok: false; error: string } | null;

/**
 * Demande de lien. Réponse identique que le compte existe ou non (personne ne peut deviner qui
 * est inscrit), et l'envoi se fait après la réponse pour que le temps de réponse ne le trahisse pas.
 */
export async function demanderReinitialisationAction(_etat: Etat, formData: FormData): Promise<Etat> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || email.length > 200) return { ok: false, error: "Indiquez votre adresse e-mail." };

  const ip = await adresseIpRequete();
  if (
    (await tropDeTentatives(`reinit-ip:${ip}`, 5, FENETRE_MS)) ||
    (await tropDeTentatives(`reinit-email:${email}`, 3, 60 * 60 * 1000))
  ) {
    return { ok: false, error: "Trop de demandes en peu de temps. Merci de réessayer un peu plus tard." };
  }

  const origineSite = await origineRequete();
  after(() => envoyerLienReinitialisation(email, origineSite).catch((e) => console.error("Échec du lien de réinitialisation :", e)));
  return { ok: true };
}

export async function nouveauMotDePasseAction(_etat: Etat, formData: FormData): Promise<Etat> {
  const ip = await adresseIpRequete();
  if (await tropDeTentatives(`reinit-nouveau:${ip}`, 10, FENETRE_MS)) {
    return { ok: false, error: "Trop de tentatives en peu de temps. Merci de réessayer un peu plus tard." };
  }
  const erreur = await reinitialiserMotDePasse(
    String(formData.get("jeton") ?? ""),
    String(formData.get("motDePasse") ?? ""),
    String(formData.get("confirmation") ?? "")
  );
  if (erreur) return { ok: false, error: erreur };
  redirect("/connexion?reinitialise=1");
}
