"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jetonSiteAttendu, motDePasseSiteCorrect, SITE_PASSWORD_COOKIE } from "@/lib/sitePassword";

export type EtatDeverrouillageSite = { erreur: string } | null;

export async function deverrouillerSiteAction(
  _etatPrecedent: EtatDeverrouillageSite,
  formData: FormData
): Promise<EtatDeverrouillageSite> {
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
