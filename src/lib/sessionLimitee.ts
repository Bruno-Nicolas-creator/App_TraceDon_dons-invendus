import "server-only";
import { getSession } from "@/lib/auth";
import { tropDActions } from "@/lib/rateLimiter";
import { MESSAGE_RESERVE, niveauSuffisant, type NiveauAcces } from "@/lib/droits";

// Session de l'utilisateur pour une action serveur, avec le plafond général de fréquence appliqué :
// les fichiers d'actions l'importent à la place de getSession pour que toute action soit limitée.
export async function getSessionLimitee() {
  const session = await getSession();
  if (session && (await tropDActions(session.userId))) {
    throw new Error("Trop d'actions en peu de temps, merci de réessayer dans quelques minutes.");
  }
  return session;
}

async function sessionAuNiveau(minimum: Exclude<NiveauAcces, "LECTURE">) {
  const session = await getSessionLimitee();
  if (session && session.role !== "COORDINATEUR" && !niveauSuffisant(session.niveau, minimum)) {
    throw new Error(MESSAGE_RESERVE[minimum]);
  }
  return session;
}

/**
 * Niveaux d'accès (chantier C4c) : toute action qui modifie des données de l'organisation récupère
 * la session par l'une de ces deux fonctions (importées sous le nom getSession* dans les fichiers
 * d'actions). Les actions sur son propre compte (nom, mot de passe, e-mail, notifications)
 * restent ouvertes à tous les niveaux via getSessionLimitee.
 */
export function getSessionOperateur() {
  return sessionAuNiveau("OPERATEUR");
}

export function getSessionAdministrateur() {
  return sessionAuNiveau("ADMINISTRATEUR");
}
