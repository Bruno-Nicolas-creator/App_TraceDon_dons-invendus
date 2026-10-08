"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adresseIpRequete } from "@/lib/requestOrigin";
import { tropDeTentatives } from "@/lib/rateLimiter";
import { jetonSiteAttendu, motDePasseSiteCorrect, SITE_PASSWORD_COOKIE } from "@/lib/sitePassword";

export type EtatDeverrouillageSite = { erreur: string } | null;

export async function deverrouillerSiteAction(
  _etatPrecedent: EtatDeverrouillageSite,
  formData: FormData
): Promise<EtatDeverrouillageSite> {
  // Sans compte à ce stade : limite par adresse IP, pour empêcher d'essayer des mots de passe en boucle.
  const ip = await adresseIpRequete();
  if (await tropDeTentatives(`deverrouillage-site:${ip}`, 10, 10 * 60 * 1000)) {
    return { erreur: "Trop d'essais, merci de réessayer dans quelques minutes." };
  }

  const motDePasse = String(formData.get("motDePasse") ?? "");
  if (!motDePasseSiteCorrect(motDePasse)) {
    return { erreur: "Mot de passe incorrect." };
  }

  const jeton = jetonSiteAttendu();
  if (jeton) {
    const magasinCookies = await cookies();
    magasinCookies.set(SITE_PASSWORD_COOKIE, jeton, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  redirect("/");
}
