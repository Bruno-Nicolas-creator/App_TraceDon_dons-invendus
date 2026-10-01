import "server-only";
import { createHash } from "node:crypto";

/**
 * Mot de passe optionnel pour tout le site, en plus des comptes utilisateurs : utile pour garder
 * l'application cachée des visiteurs tant qu'elle n'est pas encore ouverte au public. Tant que
 * SITE_PASSWORD n'est pas défini, ce contrôle est simplement désactivé (aucun crash, comportement
 * inchangé).
 *
 * Implémenté via le layout racine (cookie + formulaire), pas via middleware.ts : sur ce
 * déploiement Vercel, process.env.SITE_PASSWORD restait invisible une fois lu depuis le fichier
 * middleware/proxy, alors que la même variable est lue normalement partout ailleurs dans l'app.
 */
export const SITE_PASSWORD_COOKIE = "site_debloque";

export function siteLockActif(): boolean {
  return !!process.env.SITE_PASSWORD;
}

export function motDePasseSiteCorrect(saisie: string): boolean {
  const motDePasse = process.env.SITE_PASSWORD;
  return !!motDePasse && saisie === motDePasse;
}

/** Jeton attendu dans le cookie de déblocage : dépend du mot de passe courant, donc un ancien
 * cookie devient automatiquement invalide si le mot de passe est changé. */
export function jetonSiteAttendu(): string | null {
  const motDePasse = process.env.SITE_PASSWORD;
  if (!motDePasse) return null;
  return createHash("sha256").update(`${motDePasse}:${process.env.SESSION_SECRET ?? ""}`).digest("hex");
}
